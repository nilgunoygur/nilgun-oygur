import "server-only";
import { createShopierClient } from "./api";

export function getShopier() {
  return createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");
}
