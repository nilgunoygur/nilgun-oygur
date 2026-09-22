import "server-only";
import { config } from "@/lib/config";
import { createShopierClient } from "./api";

export function getShopier() {
  return createShopierClient(config().shopier.token ?? "");
}
