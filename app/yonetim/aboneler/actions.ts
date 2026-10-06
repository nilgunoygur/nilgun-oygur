"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { removeSubscriber as remove } from "@/lib/newsletter";
import { removeResendContact } from "@/lib/newsletter-resend";
import type { FormState } from "@/components/akademi/form-status";

export async function removeSubscriber(id: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    await remove(getDatabase(), viewer.user.id, z.uuid().parse(id), removeResendContact);
    revalidatePath("/yonetim/aboneler");
    return { status: "success", message: "Abone silindi." };
  } catch {
    return { status: "error", message: "Abone silinemedi. Lütfen yeniden deneyin." };
  }
}
