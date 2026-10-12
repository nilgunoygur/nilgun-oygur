"use client";
import { useEffect } from "react";
import { toast } from "sonner";

export type FormState = { status: "idle" | "success" | "error"; message: string };
export const idleForm: FormState = { status: "idle", message: "" };

// Results and failures are shown as toasts everywhere, never as text in the page.

/** Toasts an error when it appears; a new error object, or the same text after it cleared, toasts again. */
export function useErrorToast(error: { message?: string } | string | false | null | undefined) {
  useEffect(() => { const message = typeof error === "string" ? error : error ? error.message : "";
    if (message) toast.error(message); }, [error]);
}

/** Toasts each new result; renders nothing. */
export function FormStatus({ state }: { state: FormState }) {
  useEffect(() => { if (state.status !== "idle") toast[state.status](state.message); }, [state]);
  return null;
}
