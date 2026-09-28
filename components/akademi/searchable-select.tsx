"use client";
import { SearchIcon } from "lucide-react";
import { matchesTurkish } from "@/lib/turkiye";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/** A select with a search box in its popup (shadcn Combobox). It posts `name` with the surrounding form, like a native select. */
export function SearchableSelect<T extends string>({ id, name, items, value, onValueChange, placeholder, searchPlaceholder, emptyText, disabled, required }: {
  id: string; name: string; items: readonly T[]; value: T | null; onValueChange: (value: T | null) => void;
  placeholder: string; searchPlaceholder: string; emptyText: string; disabled?: boolean; required?: boolean;
}) {
  return <Combobox items={items} value={value} onValueChange={onValueChange} filter={matchesTurkish} name={name} required={required} disabled={disabled} autoHighlight>
    <ComboboxTrigger id={id} disabled={disabled} className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base transition-colors outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-popup-open:border-ring md:text-sm">
      <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}><ComboboxValue placeholder={placeholder} /></span>
    </ComboboxTrigger>
    <ComboboxContent className="rounded-xl *:data-[slot=input-group]:m-2 *:data-[slot=input-group]:mb-1 *:data-[slot=input-group]:h-10 *:data-[slot=input-group]:rounded-lg">
      <ComboboxInput showTrigger={false} placeholder={searchPlaceholder} aria-label={searchPlaceholder}>
        <InputGroupAddon><SearchIcon /></InputGroupAddon>
      </ComboboxInput>
      <ComboboxEmpty className="px-3 py-6">{emptyText}</ComboboxEmpty>
      <ComboboxList className="max-h-[min(17rem,calc(var(--available-height)-3.75rem))] scroll-py-1.5 p-1.5">
        {(item: T) => <ComboboxItem key={item} value={item} className="min-h-10 gap-2 rounded-md py-2 pr-9 pl-3 text-[15px] md:text-sm">{item}</ComboboxItem>}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>;
}
