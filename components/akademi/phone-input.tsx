"use client";
import { useState, type Ref } from "react";
import Image from "next/image";
import { callingCode, groupNational, phoneCountries, splitPhone, type CountryCode } from "@/lib/phone";
import { matchesTurkish } from "@/lib/turkiye";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger } from "@/components/ui/combobox";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { picker, PickerSearch } from "./searchable-select";

type Country = (typeof phoneCountries)[number];
const byCode = new Map(phoneCountries.map(country => [country.code, country]));

function Flag({ code }: { code: CountryCode }) {
  return <Image src={`/flags/${code}.svg`} alt="" width={21} height={14} unoptimized className="h-3.5 w-[21px] shrink-0 rounded-[3px] object-cover ring-1 ring-black/10" />;
}

// Digits search the dial code ("49" → Almanya); letters search Turkish names or ISO codes.
function matchesCountry(country: Country, query: string) {
  const digits = query.replace(/\D/g, "");
  if (digits) return country.dial.slice(1).startsWith(digits);
  return matchesTurkish(country.name, query) || country.code.toLowerCase() === query.trim().toLowerCase();
}

/** Flag country picker plus the national number (no trunk 0); the value is E.164 or "". */
export function PhoneInput({ id, value, onChange, onBlur, ref, invalid, onZeroRemoved }: {
  id: string; value: string; onChange: (value: string) => void; onBlur?: () => void; ref?: Ref<HTMLInputElement>;
  invalid?: boolean; onZeroRemoved?: (removed: boolean) => void;
}) {
  const [synced, setSynced] = useState(value);
  const [{ country, digits }, setParts] = useState(() => splitPhone(value));
  // A reset from the form (not our own onChange) re-splits the value.
  if (value !== synced) { setSynced(value); setParts(splitPhone(value, country)); }

  const update = (next: CountryCode, nextDigits: string) => {
    const out = nextDigits ? callingCode(next) + nextDigits : "";
    setParts({ country: next, digits: nextDigits }); setSynced(out); onChange(out);
  };
  const type = (raw: string) => {
    // A pasted international number ("+49 …" or "0049 …") picks its own country.
    const international = raw.trim().replace(/^00/, "+");
    if (international.startsWith("+")) {
      const pasted = splitPhone(international, country);
      if (pasted.digits) { onZeroRemoved?.(false); update(pasted.country, pasted.digits); return; }
    }
    const typed = raw.replace(/\D/g, "");
    onZeroRemoved?.(/^0/.test(typed));
    update(country, typed.replace(/^0+/, "").slice(0, 15));
  };
  const selected = byCode.get(country) ?? phoneCountries[0];

  // Two segments of one field; a plain wrapper, since InputGroupAddon's margin and padding break the alignment.
  return <InputGroup className="overflow-hidden">
    <div className="flex self-stretch">
      <Combobox items={phoneCountries} value={selected} onValueChange={next => { if (next) update(next.code, digits); }} filter={matchesCountry} itemToStringLabel={item => item.name} autoHighlight>
        <ComboboxTrigger aria-label={`Ülke kodu: ${selected.name} ${selected.dial}`} className="flex h-full items-center gap-1.5 border-r border-input px-2.5 text-base font-medium text-foreground transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted/70 disabled:pointer-events-none data-popup-open:bg-muted/70 md:text-sm">
          <Flag code={selected.code} /><span className="tabular-nums">{selected.dial}</span>
        </ComboboxTrigger>
        <ComboboxContent align="start" className={`${picker.content} w-80 min-w-0 max-w-[calc(100vw-2rem)]`}>
          <PickerSearch placeholder="Ülke veya kod ara…" />
          <ComboboxEmpty className={picker.empty}>Bu adla bir ülke bulunamadı.</ComboboxEmpty>
          <ComboboxList className={picker.list}>
            {(item: Country) => <ComboboxItem key={item.code} value={item} className={picker.item}>
              <Flag code={item.code} /><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="text-muted-foreground tabular-nums">{item.dial}</span>
            </ComboboxItem>}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
    <InputGroupInput ref={ref} id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country === "TR" ? "532 123 45 67" : ""}
      value={groupNational(country, digits)} onChange={event => type(event.target.value)} onBlur={onBlur} aria-invalid={invalid || undefined} className="tabular-nums" />
  </InputGroup>;
}
