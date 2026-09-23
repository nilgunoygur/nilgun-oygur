import { requireOwner } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

export async function GET() {
  try { await requireOwner(); }
  catch { return Response.json({ error: "Yetkiniz yok." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }); }
  const { courses } = await akademi().owner.catalog();
  return Response.json({ courses }, { headers: { "Cache-Control": "private, no-store" } });
}
