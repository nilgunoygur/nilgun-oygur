import { config } from "@/lib/config";
import { akademi, catalogChangedByProvider } from "@/lib/akademi/server";

const noStore = { "Cache-Control": "no-store" };

// Shopier retries non-200 responses for up to 72 hours and expects an answer within five seconds.
export async function POST(request: Request) {
  const { enabled, shopier } = config();
  if (!enabled.webhooks) return new Response(null, { status: 503, headers: noStore });
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return new Response(null, { status: 413, headers: noStore });
  const { status, outcome, catalogChanged } = await akademi().webhooks.shopier(rawBody, request.headers, shopier.webhookTokens);
  if (catalogChanged) catalogChangedByProvider();
  return Response.json({ outcome }, { status, headers: noStore });
}
