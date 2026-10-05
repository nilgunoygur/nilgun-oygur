"use server";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { requireStudent } from "@/lib/auth/viewer";
import { authDestination, ownerHome } from "@/lib/auth/navigation";
import { getAuth } from "@/lib/auth";
import { akademi, courseCards } from "@/lib/akademi/server";
import { refundNoticeCookie } from "@/lib/akademi/claim-schema";
import type { z } from "zod";
import { profileInput } from "@/lib/auth/profile";
import { contactInput, type ContactInput } from "@/lib/auth/contact";
import type { FormState } from "@/components/akademi/form-status";

/** The header menu's data: the owner link and the refund notices this student has not closed. */
export async function accountOptions() {
  const viewer = await requireStudent();
  const [requests, closed] = await Promise.all([akademi().access.refundNotices(viewer.user.id), cookies()]);
  const open = requests.filter(request => !request.dismissible || !closed.has(refundNoticeCookie(request.id)));
  const cards = open.length ? await courseCards() : {};
  return { isOwner: viewer.owner, notices: open.map(request => ({ id: request.id, status: request.status, dismissible: request.dismissible, note: request.ownerNote, orderId: request.orderId, course: cards[request.productId]?.title ?? "Akademi eğitimi" })) };
}

/** Where a sign-in leads: an owner with no destination of their own lands on the dashboard. */
export async function postLoginDestination(next?: string) {
  const viewer = await requireStudent().catch(() => null);
  return next === undefined && viewer?.owner ? ownerHome : authDestination(next);
}

export async function saveProfile(input: z.input<typeof profileInput>): Promise<FormState> {
  try {
    await requireStudent();
    const parsed = profileInput.safeParse(input);
    if (!parsed.success) return { status: "error", message: "Adınızı ve fotoğrafınızı kontrol edin. Fotoğraf JPG, PNG veya WebP olmalıdır." };
    await getAuth().api.updateUser({ headers: await headers(), body: parsed.data });
    refresh();
    return { status: "success", message: "Profiliniz güncellendi." };
  } catch { return { status: "error", message: "Profil kaydedilemedi. Lütfen yeniden giriş yapıp deneyin." }; }
}

export async function saveContact(input: ContactInput): Promise<FormState> {
  try {
    await requireStudent();
    const parsed = contactInput.safeParse(input);
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "İletişim bilgilerinizi kontrol edin." };
    await getAuth().api.updateUser({ headers: await headers(), body: parsed.data });
    refresh();
    return { status: "success", message: "İletişim bilgileriniz güncellendi." };
  } catch { return { status: "error", message: "İletişim bilgileri kaydedilemedi. Lütfen yeniden giriş yapıp deneyin." }; }
}
