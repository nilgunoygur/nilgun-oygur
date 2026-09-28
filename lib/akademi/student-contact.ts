import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { user } from "../db/schema.ts";
import { checkDistrict, contactFields, type Contact } from "../auth/profile.ts";
import { plateCode } from "../turkiye.ts";
import type { ShopierOrder } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";

// Student Contact: phone and address. The student owns them; a Shopier checkout only fills what is still empty.

const empty: Contact = { phone: null, address: null, district: null, city: null, postcode: null };

export async function studentContact(db: Database, userId: string): Promise<Contact> {
  const [row] = await db.select({ phone: user.phone, address: user.address, district: user.district, city: user.city, postcode: user.postcode })
    .from(user).where(eq(user.id, userId));
  return row ?? empty;
}

const shopierAddress = z.object({
  address: contactFields.address, district: contactFields.district, city: contactFields.city,
  postcode: contactFields.postcode.catch(null),
});

/** What the buyer typed at checkout, normalized: the first valid phone and the first complete address, billing before shipping. */
export function shopierContact(order: ShopierOrder): { phone: string | null; address: Omit<Contact, "phone"> | null } {
  const parties = [order.billingInfo, order.shippingInfo];
  const phone = parties.map(party => contactFields.phone.safeParse(party?.phone ?? "")).find(result => result.success)?.data ?? null;
  for (const party of parties) {
    const parsed = shopierAddress.safeParse(party ?? {});
    if (!parsed.success) continue;
    const { postcode, city, address } = parsed.data;
    const { district } = checkDistrict(city, parsed.data.district);
    if (!district) continue;
    return { phone, address: { address, district, city, postcode: postcode?.startsWith(plateCode(city)) ? postcode : null } };
  }
  return { phone, address: null };
}

/** Fills an empty phone, and an empty address as one block, from a Shopier order of this student. Never overwrites. */
export async function adoptShopierContact(db: Database, userId: string, order: ShopierOrder): Promise<{ phone: boolean; address: boolean }> {
  const found = shopierContact(order);
  const phone = !!found.phone && (await db.update(user).set({ phone: found.phone })
    .where(and(eq(user.id, userId), isNull(user.phone))).returning({ id: user.id })).length > 0;
  const address = !!found.address && (await db.update(user).set(found.address)
    .where(and(eq(user.id, userId), isNull(user.address), isNull(user.district), isNull(user.city))).returning({ id: user.id })).length > 0;
  return { phone, address };
}
