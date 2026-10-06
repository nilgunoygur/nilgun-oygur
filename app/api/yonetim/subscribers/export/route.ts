import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { istanbulDay } from "@/lib/akademi/format";
import { subscribersCsv } from "@/lib/newsletter";
import { refuse } from "@/lib/akademi/product-request";

export async function GET() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  try {
    return new Response(await subscribersCsv(getDatabase()), { headers: {
      ...privateNoStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bulten-aboneleri-${istanbulDay(new Date())}.csv"`,
    } });
  } catch {
    return refuse("Abone listesi dışa aktarılamadı.", 500);
  }
}
