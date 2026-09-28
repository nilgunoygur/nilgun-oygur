import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { user } from "../db/schema.ts";
import { contactFields, type Contact } from "../auth/contact.ts";
import { matchDistrict, plateCode } from "../turkiye.ts";
import type { ShopierOrder } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";

export const contactColumns = { phone: user.phone, address: user.address, district: user.district, city: user.city, postcode: user.postcode };
const empty: Contact = { phone: null, address: null, district: null, city: null, postcode: null };

export async function studentContact(db: Database, userId: string): Promise<Contact> {
  const [row] = await db.select(contactColumns).from(user).where(eq(user.id, userId));
  return row ?? empty;
}

const shopierAddress = z.object({
  address: contactFields.address, district: contactFields.district, city: contactFields.city,
  postcode: contactFields.postcode.catch(null),
});

/** First valid phone and first complete address; billing before shipping. */
function shopierContact(order: ShopierOrder): { phone: string | null; address: Omit<Contact, "phone"> | null } {
  const parties = [order.billingInfo, order.shippingInfo];
  const phone = parties.map(party => contactFields.phone.safeParse(party?.phone ?? "")).find(result => result.success)?.data ?? null;
  for (const party of parties) {
    const parsed = shopierAddress.safeParse(party ?? {});
    if (!parsed.success) continue;
    const { postcode, city, address } = parsed.data;
    const district = matchDistrict(city, parsed.data.district);
    if (!district) continue;
    return { phone, address: { address, district, city, postcode: postcode?.startsWith(plateCode(city)) ? postcode : null } };
  }
  return { phone, address: null };
}

/** Never overwrites; the address is filled as one block. */
export async function adoptShopierContact(db: Database, userId: string, order: ShopierOrder) {
  const { phone, address } = shopierContact(order);
  if (phone) await db.update(user).set({ phone }).where(and(eq(user.id, userId), isNull(user.phone)));
  if (address) await db.update(user).set(address).where(and(eq(user.id, userId), isNull(user.address), isNull(user.district), isNull(user.city)));
}
