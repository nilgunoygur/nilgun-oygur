// Sends a signed fake order.created webhook to a local server. Usage: pnpm run shopier:simulate <buyer-email> <shopier-product-id> [http://localhost:3000]
import { createHmac, randomInt } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const [email, productId, base = "http://localhost:3000"] = process.argv.slice(2);
if (!email || !/^\d+$/.test(productId ?? "")) throw new Error("Usage: pnpm run shopier:simulate <buyer-email> <shopier-product-id> [base-url]");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("Simulated orders may only be sent to a local server.");
const token = process.env.SHOPIER_WEBHOOK_TOKEN;
if (!token) throw new Error("SHOPIER_WEBHOOK_TOKEN is not set in .env.local.");

const orderId = String(900_000_000 + randomInt(99_999_999));
const body = JSON.stringify({
  id: orderId, status: "unfulfilled", paymentStatus: "paid", installments: false,
  dateCreated: new Date().toISOString().replace(/\.\d{3}Z$/, "+0000"), currency: "TRY", paymentMethod: "creditCard",
  totals: { subtotal: "1.00", shipping: "0.00", discount: "0.00", total: "1.00" },
  shippingInfo: { firstName: "Test", lastName: "Alıcı", email }, billingInfo: {},
  lineItems: [{ productId, title: "Simulated order", type: "digital", quantity: 1, price: "1.00", total: "1.00" }],
});
const response = await fetch(new URL("/api/shopier/webhook", base), {
  method: "POST",
  headers: {
    "content-type": "application/json", "shopier-event": "order.created", "shopier-webhook-id": `simulated-${orderId}`,
    "shopier-signature": createHmac("sha256", token).update(body).digest("hex"),
  },
  body,
});
console.log(`Simulated order #${orderId} for ${email} (product ${productId}): HTTP ${response.status}`, await response.text());
