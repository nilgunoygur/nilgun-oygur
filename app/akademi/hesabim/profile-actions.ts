"use server";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { requireStudent } from "@/lib/auth/viewer";
import { getAuth } from "@/lib/auth";
import { akademi, courseCards } from "@/lib/akademi/server";
import { refundNoticeCookie } from "@/lib/akademi/claim-schema";
import type { z } from "zod";
import { profileInput } from "@/lib/auth/profile";
import { contactInput, type ContactInput } from "@/lib/auth/contact";
import type { FormState } from "@/components/akademi/form-status";

export async function accountOptions() {
  const viewer = await requireStudent();
  const [requests, cards, closed] = await Promise.all([akademi().access.refundNotices(viewer.user.id), courseCards(), cookies()]);
  // A pending request explains why a course is closed, so only a decided one can be dismissed.
  const notices = requests.filter(request => request.status === "pending" || !closed.has(refundNoticeCookie(request.id)))
    .map(request => ({ id: request.id, status: request.status, note: request.ownerNote, orderId: request.orderId, course: cards[request.productId]?.title ?? "Akademi eğitimi" }));
  return { isOwner: viewer.owner, notices };
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
