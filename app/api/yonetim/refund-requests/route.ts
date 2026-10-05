import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { refundListSchema } from "@/lib/akademi/owner-forms";
import { refuse } from "@/lib/akademi/product-request";

export async function GET(request: Request) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const query = refundListSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return refuse("Geçersiz filtre.");
  try {
    return Response.json(await akademi().owner.refundRequests(query.data), { headers: privateNoStore });
  } catch {
    return refuse("İade talepleri yüklenemedi.", 500);
  }
}
