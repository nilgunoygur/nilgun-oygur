import { akademi, catalogChangedByProvider } from "@/lib/akademi/server";
import { isCronRequest } from "@/lib/cron-auth";
import { deleteStoredFiles } from "@/lib/files/storage";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401, headers: noStore });
  try {
    const { courses: { files, ...courses }, ...result } = await akademi().access.replayRecentOrders();
    await deleteStoredFiles(files);
    catalogChangedByProvider();
    return Response.json({ ...result, courses }, { headers: noStore });
  } catch {
    return Response.json({ error: "Shopier sync is unavailable." }, { status: 503, headers: noStore });
  }
}

// Vercel Cron invokes GET with the same bearer secret.
export const GET = POST;
