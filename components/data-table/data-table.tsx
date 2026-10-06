"use client";

import {
  FlexRender,
  type Row,
  type RowData,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import * as React from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";

import {
  getColumnSizeStyle,
  getColumnSizingStyle,
} from "@/lib/data-table-utils";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDirection } from "@/components/ui/direction";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<
  TData extends RowData,
> extends React.ComponentProps<"div"> {
  table: TanstackTable<DataTableFeatures, TData>;
  pageSizeOptions?: number[];
}

export function DataTable<TData extends RowData>({
  table,
  pageSizeOptions,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const dir = useDirection();
  const rows = table.getRowModel().rows;

  return (
    <div
      dir={dir}
      className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
      {...props}
    >
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table className="table-fixed" style={getColumnSizingStyle(table)}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="overflow-hidden"
                    style={getColumnSizeStyle(header.column)}
                  >
                    {header.isPlaceholder ? null : (
                      <FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => <MemoizedDataTableRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllLeafColumns().length}
                  className="h-24 text-center"
                >
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
    </div>
  );
}

function DataTableRow<TData extends RowData>({
  row,
}: {
  row: Row<DataTableFeatures, TData>;
}) {
  return (
    <TableRow>
      {row.getAllCells().map((cell) => (
        <TableCell
          key={cell.id}
          className="overflow-hidden"
          style={getColumnSizeStyle(cell.column)}
        >
          <FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  );
}

const MemoizedDataTableRow = React.memo(DataTableRow) as typeof DataTableRow;
