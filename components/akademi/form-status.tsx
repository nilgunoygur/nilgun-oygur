import { Alert, AlertDescription } from "@/components/ui/alert";

export type FormState = { status: "idle" | "success" | "error"; message: string };
export const idleForm: FormState = { status: "idle", message: "" };

export function FormStatus({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return <Alert variant={state.status === "error" ? "destructive" : "default"}><AlertDescription>{state.message}</AlertDescription></Alert>;
}
