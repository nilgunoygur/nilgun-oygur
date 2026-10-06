"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import type { FormState } from "@/components/akademi/form-status";

export async function removeSubscriber(id: string): Promise<FormState> {
  const viewer = await requireOwner();
  const failed: FormState = { status: "error", message: "Abone silinemedi. Lütfen yeniden deneyin." };
  if (!z.uuid().safeParse(id).success) return failed;
  try {
    await akademi().owner.removeSubscriber(viewer.user.id, id);
    revalidatePath("/yonetim/aboneler");
    return { status: "success", message: "Abone silindi." };
  } catch {
    return failed;
  }
}
