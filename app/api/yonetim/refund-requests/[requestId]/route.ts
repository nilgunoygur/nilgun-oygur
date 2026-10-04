import { z } from "zod";
import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { refundDecisionSchema } from "@/lib/akademi/owner-forms";
import { OwnerInputError } from "@/lib/akademi/owner-commands";
import { kurus, productFailure, refuse } from "@/lib/akademi/product-request";
import { ShopierError } from "@/lib/shopier/api";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const requestId = z.uuid().safeParse((await params).requestId);
  const input = refundDecisionSchema.safeParse(await request.json().catch(() => null));
  if (!requestId.success || !input.success) return refuse(input.error?.issues[0]?.message ?? "Geçersiz istek.");
  const { data } = input;
  try {
    await akademi().owner.decideRefundRequest(viewer.user.id, requestId.data,
      data.decision === "approve" ? { approve: true, amountKurus: kurus(data.amount), note: data.note } : { approve: false, note: data.note });
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch (error) {
    if (error instanceof OwnerInputError || (error instanceof ShopierError && error.refused)) return productFailure(error);
    return refuse("Shopier’den yanıt alınamadı. İade gönderilmiş olabilir; yeniden denemeden önce Shopier panelinden kontrol edin.", 502);
  }
}
