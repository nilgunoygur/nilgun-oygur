"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { removeSubscriber as remove } from "@/lib/newsletter";
import { removeResendContact } from "@/lib/newsletter-resend";
import type { FormState } from "@/components/akademi/form-status";

export async function removeSubscriber(id: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const db = getDatabase();
    const [subscriber] = await db.select({ email: newsletterSubscribers.email }).from(newsletterSubscribers).where(eq(newsletterSubscribers.id, z.uuid().parse(id)));
    // Resend first: an address still there would keep receiving the newsletter.
    if (subscriber && !await removeResendContact(subscriber.email)) throw new Error("Resend kept the contact.");
    await remove(db, viewer.user.id, id);
    revalidatePath("/yonetim/aboneler");
    return { status: "success", message: "Abone silindi." };
  } catch {
    return { status: "error", message: "Abone silinemedi. Lütfen yeniden deneyin." };
  }
}
