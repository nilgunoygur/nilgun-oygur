import { and, count, countDistinct, eq, gte, lt, sql, type AnyColumn } from "drizzle-orm";
import { shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { buyerEmail, parsePriceKurus, refundedAt, type ShopierClient } from "../shopier/api.ts";
import { istanbulDay } from "./format.ts";
import { pendingRefundCount } from "./refund-requests.ts";

export type Period = "week" | "month" | "year" | "custom";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayAfter = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const toInstant = (value: string) => new Date(`${value}T00:00:00+03:00`);
const purchaseDay = sql<string>`to_char(${shopierPurchases.purchasedAt} AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD')`;
const purchaseTotal = sql<number>`coalesce(sum(${shopierPurchases.amountKurus}), 0)::float8`;
const refundDay = sql<string>`to_char(${shopierRefunds.refundedAt} AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD')`;
const refundTotal = sql<number>`coalesce(sum(${shopierRefunds.amountKurus}), 0)::float8`;
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

/** The period's figures and, for comparison, the window of equal length just before it. */
export async function ownerDashboard(db: Database, range: DashboardRange) {
  const length = range.end.getTime() - range.start.getTime();
  const earlier = new Date(range.start.getTime() - length);
  // Each table is read once for both windows; `now` and `before` split the rows.
  const now = (column: AnyColumn) => sql`filter (where ${gte(column, range.start)})`, before = (column: AnyColumn) => sql`filter (where ${lt(column, range.start)})`;
  const bought = shopierPurchases.purchasedAt, joined = user.createdAt;
  const [[users], purchases, activity, refundDays, pendingRefunds] = await Promise.all([
    db.select({ total: count(), new: sql<number>`count(*) filter (where ${and(gte(joined, range.start), lt(joined, range.end))})::int`, newBefore: sql<number>`count(*) filter (where ${and(gte(joined, earlier), lt(joined, range.start))})::int` }).from(user),
    db.select({ currency: shopierPurchases.currency,
      orders: sql<number>`count(distinct ${shopierPurchases.shopierOrderId}) ${now(bought)}::int`, items: sql<number>`count(*) ${now(bought)}::int`, amount: sql<number>`coalesce(sum(${shopierPurchases.amountKurus}) ${now(bought)}, 0)::float8`,
      ordersBefore: sql<number>`count(distinct ${shopierPurchases.shopierOrderId}) ${before(bought)}::int`, amountBefore: sql<number>`coalesce(sum(${shopierPurchases.amountKurus}) ${before(bought)}, 0)::float8`,
    }).from(shopierPurchases).where(and(gte(bought, earlier), lt(bought, range.end))).groupBy(shopierPurchases.currency),
    db.select({ day: purchaseDay, amount: purchaseTotal, orders: countDistinct(shopierPurchases.shopierOrderId) }).from(shopierPurchases).where(and(gte(bought, range.start), lt(bought, range.end), eq(shopierPurchases.currency, "TRY"))).groupBy(purchaseDay).orderBy(purchaseDay),
    // Refunds count on the day Shopier completed them; TRY only, like the chart.
    db.select({ day: refundDay, amount: refundTotal, count: count() }).from(shopierRefunds).where(and(gte(shopierRefunds.refundedAt, earlier), lt(shopierRefunds.refundedAt, range.end), eq(shopierRefunds.currency, "TRY"))).groupBy(refundDay).orderBy(refundDay),
    pendingRefundCount(db),
  ]);
  const sum = <T,>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const refundActivity = refundDays.filter(row => row.day >= range.from), refundsBefore = refundDays.filter(row => row.day < range.from);
  const lira = purchases.find(row => row.currency === "TRY");
  return {
    totalUsers: users.total, newUsers: users.new, orders: sum(purchases, row => row.orders), items: sum(purchases, row => row.items),
    revenue: purchases.filter(row => row.orders > 0).map(({ currency, amount }) => ({ currency, amount })), activity,
    refunds: { amount: sum(refundActivity, row => row.amount), count: sum(refundActivity, row => row.count) }, refundActivity, pendingRefunds,
    previous: { days: Math.round(length / 86_400_000), gross: lira?.amountBefore ?? 0, orders: sum(purchases, row => row.ordersBefore), refunded: sum(refundsBefore, row => row.amount), newUsers: users.newBefore },
  };
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
      at: refundedAt(refund), amount: -(parsePriceKurus(refund.total) ?? 0),
      currency: refund.currency, title: refund.type === "full" ? "Tam iade" : "Kısmi iade", email: null,
    }));
    return { items: [...sales, ...returned].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5), unavailable: false, refundsUnavailable };
  } catch (error) {
    console.warn("Shopier recent transactions unavailable", error instanceof Error ? error.message : "unknown error");
    return { items: [], unavailable: true, refundsUnavailable: true };
  }
}

export function chartSeries(range: DashboardRange, activity: { day: string; amount: number; orders: number }[], refundActivity: { day: string; amount: number }[]) {
  const days = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000 + 1;
  const unit = days > 1095 ? "year" : days > 45 ? "month" : "day";
  const size = unit === "year" ? 4 : unit === "month" ? 7 : 10;
  const empty = { amount: 0, orders: 0, refunded: 0 };
  const totals = new Map<string, typeof empty>();
  const add = (day: string, part: Partial<typeof empty>) => {
    const key = day.slice(0, size), previous = totals.get(key) ?? empty;
    totals.set(key, { amount: previous.amount + (part.amount ?? 0), orders: previous.orders + (part.orders ?? 0), refunded: previous.refunded + (part.refunded ?? 0) });
  };
  for (const item of activity) add(item.day, item);
  for (const item of refundActivity) add(item.day, { refunded: item.amount });
  const points = [];
  const cursor = new Date(`${range.from}T00:00:00Z`);
  const last = new Date(`${range.to}T00:00:00Z`);
  if (unit === "year") cursor.setUTCMonth(0, 1);
  if (unit === "month") cursor.setUTCDate(1);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, size);
    points.push({ day: key, ...totals.get(key) ?? empty });
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
      return { range, data, chart: chartSeries(range, data.activity, data.refundActivity) };
    },
    transactions(params: DashboardParams) {
      const range = dashboardRange(params, now());
      return recentShopierTransactions(shopier, range);
    },
  };
}
