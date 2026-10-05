import type { ComponentProps, ReactNode } from "react";
import { Switch } from "@/components/ui/switch";

export function PublishSwitch({ status, onChange, children, ...props }: Omit<ComponentProps<typeof Switch>, "checked" | "onCheckedChange" | "onChange" | "children"> & { status: string; onChange: (status: "published" | "draft") => void; children: ReactNode }) {
  return <div className="flex w-fit items-center gap-2.5 text-sm font-medium"><Switch {...props} checked={status === "published"} onCheckedChange={checked => onChange(checked ? "published" : "draft")} />{children}</div>;
}
