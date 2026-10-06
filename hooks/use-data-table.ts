import {
  type ColumnFiltersState,
  functionalUpdate,
  type PaginationState,
  type RowData,
  type SortingState,
  type TableOptions,
  type Updater,
  useTable,
} from "@tanstack/react-table";
import {
  parseAsInteger,
  useQueryState,
  type UseQueryStateOptions,
  useQueryStates,
} from "nuqs";
import * as React from "react";

import type {
  ColumnFilterItem,
  FilterVariant,
} from "@/lib/data-table-types";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  type DataTableFeatures,
  dataTableFeatures,
} from "@/lib/data-table-features";
import {
  getColumnFilterParser,
  getColumnFilters,
  getColumnFiltersKey,
  getSortingStateParser,
  sortColumnFiltersBySearch,
} from "@/lib/data-table-parsers";
import {
  getActiveFilters,
  normalizeColumnFilter,
} from "@/lib/data-table-utils";

const PAGE_KEY = "page";
const PER_PAGE_KEY = "perPage";
const SORT_KEY = "sort";
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const DEFAULT_PAGE_SIZE = 10;
const EMPTY_SORTING: SortingState = [];

interface FiltersDraft {
  filters: ColumnFiltersState;
  urlFiltersKey: string;
}

type UseDataTableProps<TData extends RowData> = Omit<
  TableOptions<DataTableFeatures, TData>,
  | "state"
  | "pageCount"
  | "features"
  | "manualFiltering"
  | "manualPagination"
  | "manualSorting"
> & {
  pageCount: number;
  clearOnDefault?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
};

function useDataTable<TData extends RowData>({
  columns,
  pageCount,
  initialState,
  clearOnDefault = false,
  shallow = true,
  startTransition,
  ...props
}: UseDataTableProps<TData>) {

  const queryStateOptions = React.useMemo<
    Omit<UseQueryStateOptions<string>, "parse">
  >(
    () => ({
      history: "replace",
      scroll: false,
      shallow,
      throttleMs: THROTTLE_MS,
      debounceMs: DEBOUNCE_MS,
      clearOnDefault,
      startTransition,
    }),
    [shallow, clearOnDefault, startTransition],
  );

  const [initialTableState] = React.useState(initialState);

  const pageParser = React.useMemo(
    () => parseAsInteger.withOptions(queryStateOptions).withDefault(1),
    [queryStateOptions],
  );
  const perPageParser = React.useMemo(
    () =>
      parseAsInteger
        .withOptions(queryStateOptions)
        .withDefault(
          initialTableState?.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
        ),
    [initialTableState, queryStateOptions],
  );

  const [page, setPage] = useQueryState(PAGE_KEY, pageParser);
  const [perPage, setPerPage] = useQueryState(PER_PAGE_KEY, perPageParser);

  const pagination = React.useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize: perPage }),
    [page, perPage],
  );

  function onPaginationChange(updater: Updater<PaginationState>) {
    const next = functionalUpdate(updater, pagination);
    void setPage(next.pageIndex + 1);
    void setPerPage(next.pageSize);
  }

  const columnIndex = React.useMemo(() => {
    const sortableIds = new Set<string>();
    const filterableVariants = new Map<string, FilterVariant>();

    for (const column of columns) {
      if (!column.id) continue;
      const hasAccessor = "accessorKey" in column || "accessorFn" in column;
      if (hasAccessor && column.enableSorting !== false) {
        sortableIds.add(column.id);
      }
      if (!column.enableColumnFilter) continue;

      filterableVariants.set(column.id, column.meta?.variant ?? "text");
    }

    return {
      sortableIds,
      filterableIds: [...filterableVariants.keys()],
      variantById: Object.fromEntries(filterableVariants),
      normalizeColumnFilters: (filters: ColumnFiltersState) =>
        filters.map((filter) =>
          normalizeColumnFilter(
            filter,
            filterableVariants.get(filter.id) ?? "text",
          ),
        ),
    };
  }, [columns]);

  const sortingParser = React.useMemo(
    () =>
      getSortingStateParser(columnIndex.sortableIds)
        .withOptions(queryStateOptions)
        .withDefault(initialTableState?.sorting ?? EMPTY_SORTING),
    [columnIndex, initialTableState, queryStateOptions],
  );

  const [sorting, setSorting] = useQueryState(SORT_KEY, sortingParser);

  function onSortingChange(updater: Updater<SortingState>) {
    void setSorting(functionalUpdate(updater, sorting));
  }

  const filterParsers = React.useMemo(
    () =>
      Object.fromEntries(
        columnIndex.filterableIds.map((id) => [
          id,
          getColumnFilterParser(
            id,
            columnIndex.variantById[id] ?? "text",
          ).withOptions(queryStateOptions),
        ]),
      ),
    [columnIndex, queryStateOptions],
  );

  const [filterParams, setFilterParams] = useQueryStates(filterParsers);

  const search = React.useSyncExternalStore(
    subscribeToHistory,
    getLocationSearch,
    getServerLocationSearch,
  );

  const urlFilters = React.useMemo(
    () =>
      sortColumnFiltersBySearch(
        getColumnFilters(
          columnIndex.filterableIds,
          (id) => filterParams[id] ?? [],
        ),
        search,
      ),
    [columnIndex, filterParams, search],
  );
  const urlFiltersKey = getColumnFiltersKey(urlFilters);

  const [filtersDraft, setFiltersDraft] = React.useState<FiltersDraft | null>(
    () => {
      const initialFilters = initialTableState?.columnFilters;
      if (urlFilters.length > 0 || !initialFilters?.length) return null;

      return {
        filters: columnIndex.normalizeColumnFilters(initialFilters),
        urlFiltersKey,
      };
    },
  );

  const columnFilters =
    filtersDraft?.urlFiltersKey === urlFiltersKey
      ? filtersDraft.filters
      : urlFilters;

  const debouncedWriteFilters = useDebouncedCallback(
    (columnFilters: ColumnFiltersState, sourceUrlFiltersKey: string) => {
      if (sourceUrlFiltersKey !== urlFiltersKey) return;

      const filters = getActiveFilters(
        columnIndex.normalizeColumnFilters(columnFilters),
      ).filter((filter) => Object.hasOwn(columnIndex.variantById, filter.id));
      const params = new Map<string, ColumnFilterItem[] | null>();

      for (const filter of filters) {
        const group = params.get(filter.id);
        if (group) group.push(filter);
        else params.set(filter.id, [filter]);
      }
      for (const id of columnIndex.filterableIds) {
        if (!params.has(id)) params.set(id, null);
      }

      const nextUrlFiltersKey = getColumnFiltersKey(filters);
      setFiltersDraft(
        (prev) => prev && { ...prev, urlFiltersKey: nextUrlFiltersKey },
      );
      void setPage(1);
      void setFilterParams(Object.fromEntries(params));
    },
    DEBOUNCE_MS,
  );

  function onColumnFiltersChange(updater: Updater<ColumnFiltersState>) {
    const filters = functionalUpdate(updater, columnFilters);
    setFiltersDraft({ filters, urlFiltersKey });
    debouncedWriteFilters(filters, urlFiltersKey);
  }

  const table = useTable(
    {
      ...props,
      features: dataTableFeatures,
      columns,
      initialState: initialTableState,
      pageCount,
      state: {
        pagination,
        sorting,
        columnFilters,
      },
      onPaginationChange,
      onSortingChange,
      onColumnFiltersChange,
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
    },
    (state) => ({
      columnFilters: state.columnFilters,
      pagination: state.pagination,
      sorting: state.sorting,
    }),
  );

  return React.useMemo(() => ({ table }), [table]);
}

function subscribeToHistory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return "";
}

export { useDataTable };
