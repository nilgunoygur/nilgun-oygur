import {
  assignPrototypeAPIs,
  assignTableAPIs,
  type ColumnFilter,
  columnFilteringFeature,
  columnSizingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  functionalUpdate,
  metaHelper,
  setStateSlice,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  type Table,
  type TableFeature,
  tableFeatures,
  type Updater,
} from "@tanstack/react-table";

import type {
  DataTableColumnMeta,
} from "@/lib/data-table-types";

import {
  getIsPlainFilter,
  normalizeColumnFilter,
  getPlainFilterValue,
} from "@/lib/data-table-utils";

declare module "@tanstack/react-table" {
  interface Plugins {
    dataTableFilteringFeature: TableFeature;
  }
}

type DataTableInstance = Table<DataTableFeatures, RowData>;

/**
 * Feature hooks get a `Table` generic over any features. This feature is only
 * registered in `dataTableFeatures`, so its hooks can use that table's types.
 */
function asDataTable(table: object) {
  return table as DataTableInstance;
}

const dataTableFilteringFeature: TableFeature = {
  getDefaultColumnDef: () => ({
    enableColumnFilter: false,
  }),
  assignColumnPrototype: (prototype, table) => {
    const instance = asDataTable(table);

    assignPrototypeAPIs("dataTableFilteringFeature", prototype, table, {
      column_getFilterValue: {
        fn: (column: { id: string }) =>
          getPlainFilter(
            instance,
            column.id,
            instance.atoms.columnFilters.get(),
          ).value,
        memoDeps: () => [instance.atoms.columnFilters.get()],
      },
      column_setFilterValue: {
        fn: (column: { id: string }, updater: Updater<unknown>) =>
          setPlainFilter(instance, column.id, updater),
      },
    });
  },
  constructTableAPIs: (table) => {
    const instance = asDataTable(table);
    assignTableAPIs("dataTableFilteringFeature", table, {
      table_setColumnFilters: {
        fn: (updater: Updater<ColumnFilter[]>) =>
          setStateSlice(table, "columnFilters", (old: ColumnFilter[]) =>
            functionalUpdate(updater, old).filter(
              (filter) => !getShouldRemoveFilter(filter, instance),
            ),
          ),
      },
    });
  },
};

function getPlainFilter(
  instance: DataTableInstance,
  columnId: string,
  filters: ColumnFilter[],
) {
  const variant =
    instance.getColumn(columnId)?.columnDef.meta?.variant ?? "text";
  const index = filters.findIndex(
    (filter) =>
      filter.id === columnId &&
      getIsPlainFilter(normalizeColumnFilter(filter, variant)),
  );
  const filter = filters[index];
  const value = filter
    ? getPlainFilterValue(normalizeColumnFilter(filter, variant))
    : undefined;

  return { index, filter, value };
}

function setPlainFilter(
  instance: DataTableInstance,
  columnId: string,
  updater: Updater<unknown>,
) {
  instance.setColumnFilters((old) => {
    const {
      index,
      filter: previous,
      value: previousValue,
    } = getPlainFilter(instance, columnId, old);
    const value = functionalUpdate(updater, previousValue);
    const next: ColumnFilter = previous?.filterId
      ? { id: columnId, value, filterId: previous.filterId }
      : { id: columnId, value };

    if (index === -1) return [...old, next];
    return old.map((filter, filterIndex) =>
      filterIndex === index ? next : filter,
    );
  });
}

/**
 * TanStack's `autoRemove` rules for plain filters. Filters with an
 * `operator` are only removed by an `undefined` value, so empty drafts in the
 * filter list survive a column `filterFn` whose `autoRemove` would drop them.
 */
function getShouldRemoveFilter(
  filter: ColumnFilter,
  instance: DataTableInstance,
) {
  if (filter.value === undefined) return true;
  if (filter.operator) return false;

  const column = instance.getColumn(filter.id);
  if (!column) return false;

  const filterFn = column.getFilterFn();
  if (filterFn?.autoRemove) {
    return filterFn.autoRemove(filter.value, column);
  }
  return typeof filter.value === "string" && !filter.value;
}

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnSizingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  dataTableFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;
