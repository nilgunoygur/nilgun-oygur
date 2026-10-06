"use client";

import {
  type Column,
  type RowData,
  Subscribe,
  type Table,
} from "@tanstack/react-table";
import { cn } from "cn";
import * as React from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface DataTableToolbarProps<
  TData extends RowData,
> extends React.ComponentProps<"div"> {
  table: Table<DataTableFeatures, TData>;
}

export function DataTableToolbar<TData extends RowData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  function onReset() {
    table.resetColumnFilters(true);
    table.resetJoinOperator(true);
  }

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 p-1",
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        <Subscribe
          source={table.atoms.columnFilters}
          selector={(filters) => filters.length > 0}
        >
          {(isFiltered) =>
            isFiltered && (
              <Button
                aria-label="Filtreleri temizle"
                variant="outline"
                className="border-dashed"
                onClick={onReset}
              >
                <X
                />
                Temizle
              </Button>
            )
          }
        </Subscribe>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
interface DataTableToolbarFilterProps<TData extends RowData> {
  column: Column<DataTableFeatures, TData>;
}

function DataTableToolbarFilter<TData extends RowData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;
  if (columnMeta?.variant !== "text") return null;

  return (
    <DataTableFilterInput
      column={column}
      placeholder={columnMeta.placeholder ?? columnMeta.label}
      className="w-40 lg:w-56"
    />
  );
}

function readFilterInputValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(",");
  }

  return "";
}

interface DataTableFilterInputProps<
  TData extends RowData,
> extends React.ComponentProps<"input"> {
  column: Column<DataTableFeatures, TData>;
}

function DataTableFilterInput<TData extends RowData>({
  column,
  type = "text",
  ...props
}: DataTableFilterInputProps<TData>) {
  return (
    <Subscribe
      source={column.table.atoms.columnFilters}
      selector={() => column.getFilterValue()}
    >
      {(filterValue) => (
        <Input
          type={type}
          {...props}
          value={readFilterInputValue(filterValue)}
          onChange={(event) =>
            column.setFilterValue(event.target.value || undefined)
          }
        />
      )}
    </Subscribe>
  );
}
