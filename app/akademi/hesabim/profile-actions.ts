"use server";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { requireStudent } from "@/lib/auth/viewer";
import { getAuth } from "@/lib/auth";
import type { z } from "zod";
import { contactInput, profileInput, type ContactInput } from "@/lib/auth/profile";
import type { FormState } from "@/components/akademi/form-status";

export async function accountOptions() {
  const viewer = await requireStudent();
  return { isOwner: viewer.owner };
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
