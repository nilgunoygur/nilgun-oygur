import { and, count, countDistinct, eq, gte, lt, sql } from "drizzle-orm";
import { shopierPurchases, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { buyerEmail, parsePriceKurus, type ShopierClient } from "../shopier/api.ts";
import { istanbulDay } from "./format.ts";

export type Period = "week" | "month" | "year" | "custom";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayAfter = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const toInstant = (value: string) => new Date(`${value}T00:00:00+03:00`);
const purchaseDay = sql<string>`to_char(${shopierPurchases.purchasedAt} AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD')`;
const purchaseTotal = sql<number>`coalesce(sum(${shopierPurchases.amountKurus}), 0)::float8`;
export type DashboardRange = ReturnType<typeof dashboardRange>;

export type DashboardParams = { period?: string; from?: string; to?: string };

export function dashboardRange(params: DashboardParams, now = new Date()) {
  const today = istanbulDay(now);
  const period: Period = params.period === "week" || params.period === "year" || params.period === "custom" ? params.period : "month";
  const [year, month, day] = today.split("-").map(Number);
  const dayOfWeek = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = period === "week" ? new Date(Date.UTC(year, month - 1, day - dayOfWeek)).toISOString().slice(0, 10)
    : period === "year" ? `${year}-01-01` : `${year}-${String(month).padStart(2, "0")}-01`;
  const validDate = (value?: string) => !!value && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const from = period === "custom" && validDate(params.from) && params.from! <= today ? params.from! : start;
  const to = period === "custom" && validDate(params.to) && params.to! >= from && params.to! <= today ? params.to! : today;
  return { period, from, to, today, start: toInstant(from), end: toInstant(dayAfter(to)) };
}

export async function ownerDashboard(db: Database, range: DashboardRange) {
  const purchasePeriod = and(gte(shopierPurchases.purchasedAt, range.start), lt(shopierPurchases.purchasedAt, range.end));
  const [allUsers, newUsers, sales, revenue, activity] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(user).where(and(gte(user.createdAt, range.start), lt(user.createdAt, range.end))),
    db.select({ orders: countDistinct(shopierPurchases.shopierOrderId), items: count() }).from(shopierPurchases).where(purchasePeriod),
    db.select({ currency: shopierPurchases.currency, amount: purchaseTotal }).from(shopierPurchases).where(purchasePeriod).groupBy(shopierPurchases.currency),
    db.select({ day: purchaseDay, amount: purchaseTotal, orders: countDistinct(shopierPurchases.shopierOrderId) }).from(shopierPurchases).where(and(purchasePeriod, eq(shopierPurchases.currency, "TRY"))).groupBy(purchaseDay).orderBy(purchaseDay),
  ]);
  return { totalUsers: allUsers[0].value, newUsers: newUsers[0].value, orders: sales[0].orders, items: sales[0].items, revenue, activity };
}

export async function recentShopierTransactions(shopier: Pick<ShopierClient, "listRecentTransactions">, range: DashboardRange) {
  try {
    const { orders, refunds, unavailable: refundsUnavailable } = await shopier.listRecentTransactions(range.start, range.end);
    const sales = orders.filter(order => order.paymentStatus === "paid").map(order => ({
      id: `order-${order.id}`, order: order.id, kind: "sale" as const, at: order.dateCreated,
      amount: parsePriceKurus(order.totals?.total ?? "") ?? order.lineItems.reduce((sum, item) => sum + (parsePriceKurus(item.total) ?? 0), 0),
      currency: order.currency, title: order.lineItems.map(item => item.title).filter(Boolean).join(", ") || "Sipariş",
      email: buyerEmail(order),
    }));
    const returned = refunds.map(refund => ({
      id: `refund-${refund.id}`, order: refund.orderId, kind: "refund" as const,
      at: refund.dateRefunded ?? refund.dateCreated, amount: -(parsePriceKurus(refund.total) ?? 0),
      currency: refund.currency, title: refund.type === "full" ? "Tam iade" : "Kısmi iade", email: null,
    }));
    return { items: [...sales, ...returned].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5), unavailable: false, refundsUnavailable };
  } catch (error) {
    console.warn("Shopier recent transactions unavailable", error instanceof Error ? error.message : "unknown error");
    return { items: [], unavailable: true, refundsUnavailable: true };
  }
}

export function chartSeries(range: DashboardRange, activity: Awaited<ReturnType<typeof ownerDashboard>>["activity"]) {
  const days = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000 + 1;
  const unit = days > 1095 ? "year" : days > 45 ? "month" : "day";
  const size = unit === "year" ? 4 : unit === "month" ? 7 : 10;
  const totals = new Map<string, { amount: number; orders: number }>();
  for (const item of activity) {
    const key = item.day.slice(0, size);
    const previous = totals.get(key) ?? { amount: 0, orders: 0 };
    totals.set(key, { amount: previous.amount + item.amount, orders: previous.orders + item.orders });
  }
  const points = [];
  const cursor = new Date(`${range.from}T00:00:00Z`);
  const last = new Date(`${range.to}T00:00:00Z`);
  if (unit === "year") cursor.setUTCMonth(0, 1);
  if (unit === "month") cursor.setUTCDate(1);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, size);
    points.push({ day: key, ...totals.get(key) ?? { amount: 0, orders: 0 } });
    if (unit === "year") cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
    else if (unit === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { unit, points };
}

/** Owner overview read model. Database, Shopier, and time enter once at this seam. */
export function createOwnerOverview({ db, shopier, now = () => new Date() }: {
  db: Database;
  shopier: Pick<ShopierClient, "listRecentTransactions">;
  now?: () => Date;
}) {
  return {
    async read(params: DashboardParams) {
      const range = dashboardRange(params, now());
      const data = await ownerDashboard(db, range);
      return { range, data, chart: chartSeries(range, data.activity) };
    },
    transactions(params: DashboardParams) {
      const range = dashboardRange(params, now());
      return recentShopierTransactions(shopier, range);
    },
  };
}
