import { timingSafeEqual } from "node:crypto";

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. */
export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return !!secret && given.length === expected.length && timingSafeEqual(given, expected);
}
