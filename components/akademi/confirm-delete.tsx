"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { FormState } from "./form-status";

/** The message of a finished action; a failed one is thrown, for useMutation. */
export async function done(action: Promise<FormState>) {
  const result = await action;
  if (result.status === "error") throw new Error(result.message);
  return result.message;
}

export function ConfirmDelete({ title, description, open, onClose, remove, children }: { title: string; description: string; open: boolean; onClose: () => void; remove: { isPending: boolean; error: Error | null; mutate: () => void }; children?: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>“{title}” silinsin mi?</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {children}
      {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" size="pill" disabled={remove.isPending} onClick={onClose}>Vazgeç</Button>
        <Button type="button" variant="destructive" size="pill" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? <Spinner /> : <Trash2 />}Evet, sil</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function DeleteIconButton({ name, onClick }: { name: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${name}: sil`} onClick={onClick}><Trash2 /></Button>;
}
