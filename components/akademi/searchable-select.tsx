"use client";
import type { Ref } from "react";
import { SearchIcon } from "lucide-react";
import { matchesTurkish } from "@/lib/turkiye";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

// Shared picker classes; concentric corners: 24px popup, 8px gap, 16px search box and rows (the inputs' radius).
export const picker = {
  content: "rounded-xl *:data-[slot=input-group]:m-2 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-10 *:data-[slot=input-group]:rounded-lg",
  list: "max-h-[min(17rem,calc(var(--available-height)-3.5rem))] scroll-py-2 p-2",
  item: "min-h-10 gap-2.5 rounded-lg py-2 pr-9 pl-3 text-[15px] md:text-sm",
  empty: "px-4 py-6",
  trigger: "flex h-(--picker-h,2rem) w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-popup-open:border-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
};

export function PickerSearch({ placeholder }: { placeholder: string }) {
  return <ComboboxInput showTrigger={false} placeholder={placeholder} aria-label={placeholder}>
    <InputGroupAddon><SearchIcon /></InputGroupAddon>
  </ComboboxInput>;
}

/** A select with a search box in its popup (shadcn Combobox), wired like any React Hook Form control. */
export function SearchableSelect<T extends string>({ id, items, value, onValueChange, onBlur, ref, invalid, placeholder, searchPlaceholder, emptyText, disabled }: {
  id: string; items: readonly T[]; value: T | null; onValueChange: (value: T | null) => void; onBlur?: () => void; ref?: Ref<HTMLButtonElement>;
  invalid?: boolean; placeholder: string; searchPlaceholder: string; emptyText: string; disabled?: boolean;
}) {
  return <Combobox items={items} value={value} onValueChange={onValueChange} filter={matchesTurkish} disabled={disabled} autoHighlight>
    <ComboboxTrigger ref={ref} id={id} onBlur={onBlur} aria-invalid={invalid || undefined} className={picker.trigger}>
      <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}><ComboboxValue placeholder={placeholder} /></span>
    </ComboboxTrigger>
    <ComboboxContent className={picker.content}>
      <PickerSearch placeholder={searchPlaceholder} />
      <ComboboxEmpty className={picker.empty}>{emptyText}</ComboboxEmpty>
      <ComboboxList className={picker.list}>
        {(item: T) => <ComboboxItem key={item} value={item} className={picker.item}>{item}</ComboboxItem>}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>;
}
