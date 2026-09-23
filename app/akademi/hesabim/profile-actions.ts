"use server";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { requireStudent } from "@/lib/auth/viewer";
import { getAuth } from "@/lib/auth";
import { profileInput } from "@/lib/auth/profile";
import type { FormState } from "@/components/akademi/form-status";

export async function accountOptions() {
  const viewer = await requireStudent();
  return { isOwner: viewer.owner };
}

export async function saveProfile(input: { name: string; image: string | null }): Promise<FormState> {
  try {
    await requireStudent();
    const parsed = profileInput.safeParse(input);
    if (!parsed.success) return { status: "error", message: "Adınızı ve fotoğrafınızı kontrol edin. Fotoğraf JPG, PNG veya WebP olmalıdır." };
    await getAuth().api.updateUser({ headers: await headers(), body: parsed.data });
    refresh();
    return { status: "success", message: "Profiliniz güncellendi." };
  } catch { return { status: "error", message: "Profil kaydedilemedi. Lütfen yeniden giriş yapıp deneyin." }; }
}
