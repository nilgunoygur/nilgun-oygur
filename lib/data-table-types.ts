import type { ColumnFilter, ColumnSort } from "@tanstack/react-table";

import type {
  FILTER_OPERATORS,
  FILTER_VARIANTS,
} from "@/lib/data-table-utils";

export interface DataTableColumnMeta {
  label?: string;
  placeholder?: string;
  variant?: FilterVariant;
  options?: FilterOption[];
  range?: [number, number];
  unit?: string;
  icon?: React.ComponentType<React.ComponentProps<"svg">>;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
  icon?: React.ComponentType<React.ComponentProps<"svg">>;
}

export type FilterOperator = keyof typeof FILTER_OPERATORS;
export type FilterVariant = (typeof FILTER_VARIANTS)[number];

export interface FilterOperatorOption {
  label: string;
  value: FilterOperator;
}

export interface ColumnSortItem<
  TColumnId extends string = string,
> extends ColumnSort {
  id: TColumnId;
}

export interface ColumnFilterItem<
  TColumnId extends string = string,
> extends ColumnFilter {
  id: TColumnId;
  value: string | string[];
  variant: FilterVariant;
  operator: FilterOperator;
  filterId: string;
}

declare module "@tanstack/react-table" {
  interface ColumnFilter extends Partial<
    Pick<ColumnFilterItem, "operator" | "variant" | "filterId">
  > {}
}
