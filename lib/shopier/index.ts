import "server-only";
import { createShopierClient } from "./api";

export function isShopierConfigured() {
  return !!process.env.SHOPIER_API_TOKEN;
}
export function getShopier() {
  return createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");
}
