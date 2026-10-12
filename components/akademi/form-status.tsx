export type FormState = { status: "idle" | "success" | "error"; message: string };
export const idleForm: FormState = { status: "idle", message: "" };
