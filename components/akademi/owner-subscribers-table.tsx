"use client";
import { useState, useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeSubscriber } from "@/app/yonetim/aboneler/actions";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDelete, done } from "./confirm-delete";
import { useDataTable } from "@/hooks/use-data-table";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { dateTimeLabel } from "@/lib/akademi/format";
import { cn } from "@/lib/utils";

type Subscriber = { id: string; email: string; createdAt: Date };

// Sorting, search and paging live in the URL; the server page queries.
const columns: ColumnDef<DataTableFeatures, Subscriber>[] = [
  {
    id: "email", accessorKey: "email", size: 640, enableColumnFilter: true,
    meta: { placeholder: "E-posta ara…", variant: "text" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="E-posta" />,
    cell: ({ row }) => <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-semibold text-forest">{row.original.email.charAt(0).toLocaleUpperCase("tr-TR")}</span>
      <a href={`mailto:${row.original.email}`} className="truncate font-medium text-foreground hover:text-forest hover:underline">{row.original.email}</a>
    </div>,
  },
  {
    id: "createdAt", accessorKey: "createdAt", size: 220,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Kayıt" />,
    cell: ({ row }) => <span className="whitespace-nowrap text-stone">{dateTimeLabel.format(row.original.createdAt)}</span>,
  },
  { id: "remove", size: 64, header: () => <span className="sr-only">İşlemler</span>, cell: ({ row }) => <div className="flex justify-end pr-2"><RemoveSubscriber subscriber={row.original} /></div> },
];

function RemoveSubscriber({ subscriber }: { subscriber: Subscriber }) {
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => done(removeSubscriber(subscriber.id)),
    onSuccess: message => { toast.success(message); setOpen(false); },
  });
  return <>
    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${subscriber.email}: sil`} onClick={() => { remove.reset(); setOpen(true); }}><Trash2 /></Button>
    <ConfirmDelete title={subscriber.email} description="Adres bülten listesinden kalıcı olarak silinir. Aynı kişi formdan yeniden abone olabilir." open={open} onClose={() => setOpen(false)} remove={remove} />
  </>;
}

export function OwnerSubscribersTable({ subscribers, pageCount, pageSize, pageSizes }: { subscribers: Subscriber[]; pageCount: number; pageSize: number; pageSizes: number[] }) {
  const [loading, startTransition] = useTransition();
  const { table } = useDataTable({
    data: subscribers, columns, pageCount, getRowId: row => row.id, shallow: false, clearOnDefault: true, startTransition,
    initialState: { pagination: { pageIndex: 0, pageSize }, sorting: [{ id: "createdAt", desc: true }] },
  });
  return (
    <DataTable table={table} pageSizeOptions={pageSizes} aria-busy={loading} className={cn("gap-4 transition-opacity [&_td]:h-14 [&_td:first-child]:pl-4 [&_th]:bg-muted/30 [&_th:first-child]:pl-4", loading && "opacity-60")}>
      <DataTableToolbar table={table} className="[--control-h:2.25rem] [&_input]:w-56 sm:[&_input]:w-72">
        <a href="/api/yonetim/subscribers/export" download className={buttonVariants({ variant: "outline" })}><Download />CSV indir</a>
      </DataTableToolbar>
    </DataTable>
  );
}
