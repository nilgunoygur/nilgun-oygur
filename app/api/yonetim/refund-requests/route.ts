import { z } from "zod";
import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

const input = z.object({ status: z.enum(["pending", "approved", "declined", "all"]).default("pending"), search: z.string().trim().max(100).default(""), page: z.coerce.number().int().min(1).max(10000).default(1) });
export async function GET(request: Request) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const query = input.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Geçersiz filtre." }, { status: 400, headers: privateNoStore });
  try {
    const { status, ...rest } = query.data;
    return Response.json(await akademi().owner.refundRequests({ ...rest, status: status === "all" ? undefined : status }), { headers: privateNoStore });
  } catch {
    return Response.json({ error: "İade talepleri yüklenemedi." }, { status: 500, headers: privateNoStore });
  }
}
