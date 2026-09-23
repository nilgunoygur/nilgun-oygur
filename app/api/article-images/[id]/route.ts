import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { articleAssets } from "@/lib/db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const [asset] = await getDatabase().select({ mime: articleAssets.mime, data: articleAssets.data }).from(articleAssets).where(eq(articleAssets.id, id)).limit(1);
  if (!asset) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(asset.data, "base64")), { headers: { "Content-Type": asset.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
