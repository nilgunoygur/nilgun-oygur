"use client";
import { useLayoutEffect, useRef, useState, type Ref } from "react";
import * as flags from "country-flag-icons/react/3x2";
import { callingCode, groupNational, phoneCountries, splitPhone, type CountryCode, type PhoneCountry } from "@/lib/phone";
import { matchesTurkish } from "@/lib/turkiye";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger } from "@/components/ui/combobox";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { picker, PickerSearch } from "./searchable-select";

const countries = phoneCountries();
const byCode = new Map(countries.map(country => [country.code, country]));
const digitCount = (text: string) => text.replace(/\D/g, "").length;

// Inline SVGs: nothing more loads when the picker opens.
function Flag({ code }: { code: CountryCode }) {
  const Svg = flags[code];
  // Wrapped: the trigger and rows force un-sized child SVGs to 16px (icon size); `size-full` opts out.
  return <span aria-hidden className="flex h-3.5 w-[21px] shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10"><Svg className="size-full" /></span>;
}

// Digits search the dial code ("49" → Almanya); letters search Turkish names or ISO codes.
function matchesCountry(country: PhoneCountry, query: string) {
  const digits = query.replace(/\D/g, "");
  if (digits) return country.dial.slice(1).startsWith(digits);
  return matchesTurkish(country.name, query) || country.code.toLowerCase() === query.trim().toLowerCase();
}

/** Value is E.164 or "". */
export function PhoneInput({ id, value, onChange, onBlur, ref, invalid, onZeroRemoved }: {
  id: string; value: string; onChange: (value: string) => void; onBlur?: () => void; ref?: Ref<HTMLInputElement>;
  invalid?: boolean; onZeroRemoved?: (removed: boolean) => void;
}) {
  const [synced, setSynced] = useState(value);
  const [{ country, digits }, setParts] = useState(() => splitPhone(value));
  // "+4…" typed before its country is known is shown as typed.
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const caretDigits = useRef<number | null>(null);
  // Re-split when the form resets the value.
  if (value !== synced) { setSynced(value); setParts(splitPhone(value, country)); setDraft(null); }

  // Restore the caret by digit count after regrouping.
  useLayoutEffect(() => {
    const element = input.current, target = caretDigits.current;
    if (!element || target === null) return;
    caretDigits.current = null;
    let position = 0;
    for (let seen = 0; position < element.value.length && seen < target; position++) if (/\d/.test(element.value[position])) seen++;
    element.setSelectionRange(position, position);
  });

  const emit = (out: string) => { setSynced(out); onChange(out); };
  const update = (next: CountryCode, nextDigits: string) => {
    setParts({ country: next, digits: nextDigits }); setDraft(null);
    emit(nextDigits ? callingCode(next) + nextDigits : "");
  };
  const type = (raw: string, caret: number) => {
    // "+49 …" or "0049 …" switches the country once its code is complete.
    const trimmed = raw.trim();
    // A lone "0" or "00" may still become "00 49 …", so it stays on screen until the next digit decides.
    if (/^0{1,2}$/.test(trimmed)) { setDraft(trimmed); emit(""); return; }
    const international = trimmed.replace(/^00/, "+");
    if (international.startsWith("+")) {
      const parsed = splitPhone(international, country);
      if (parsed.digits) { onZeroRemoved?.(false); update(parsed.country, parsed.digits); return; }
      const text = "+" + international.replace(/\D/g, "");
      setDraft(text); emit(text);
      return;
    }
    const typed = raw.replace(/\D/g, "");
    const zeros = typed.length - typed.replace(/^0+/, "").length;
    onZeroRemoved?.(zeros > 0);
    caretDigits.current = Math.max(0, digitCount(raw.slice(0, caret)) - zeros);
    update(country, typed.slice(zeros, zeros + 15));
  };
  // Backspace right after a group space deletes the digit before it.
  const backspaceOverSpace = (element: HTMLInputElement) => {
    const at = element.selectionStart ?? 0;
    if (draft !== null || at !== element.selectionEnd || at === 0 || /\d/.test(element.value[at - 1])) return false;
    const before = digitCount(element.value.slice(0, at));
    if (before > 0) { caretDigits.current = before - 1; update(country, digits.slice(0, before - 1) + digits.slice(before)); }
    return true;
  };
  const selected = byCode.get(country) ?? countries[0];

  // Plain wrapper, not InputGroupAddon: the addon's spacing misaligns the trigger.
  return <InputGroup className="overflow-hidden">
    <div className="flex self-stretch">
      <Combobox items={countries} value={selected} onValueChange={next => { if (next) update(next.code, draft === null ? digits : ""); }} filter={matchesCountry} itemToStringLabel={item => item.name} autoHighlight>
        <ComboboxTrigger aria-label={`Ülke kodu: ${selected.name} ${selected.dial}`} className="flex h-full items-center gap-1.5 border-r border-input px-2.5 text-base font-medium text-foreground transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted/70 disabled:pointer-events-none data-popup-open:bg-muted/70 md:text-sm">
          <Flag code={selected.code} /><span className="tabular-nums">{selected.dial}</span>
        </ComboboxTrigger>
        <ComboboxContent align="start" className={`${picker.content} w-80 min-w-0 max-w-[calc(100vw-2rem)]`}>
          <PickerSearch placeholder="Ülke veya kod ara…" />
          <ComboboxEmpty className={picker.empty}>Bu adla bir ülke bulunamadı.</ComboboxEmpty>
          <ComboboxList className={picker.list}>
            {(item: PhoneCountry) => <ComboboxItem key={item.code} value={item} className={picker.item}>
              <Flag code={item.code} /><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="text-muted-foreground tabular-nums">{item.dial}</span>
            </ComboboxItem>}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
    <InputGroupInput id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country === "TR" ? "532 123 45 67" : ""}
      ref={element => { input.current = element; if (typeof ref === "function") ref(element); else if (ref) ref.current = element; }}
      value={draft ?? groupNational(country, digits)} onChange={event => type(event.target.value, event.target.selectionStart ?? event.target.value.length)}
      onKeyDown={event => { if (event.key === "Backspace" && backspaceOverSpace(event.currentTarget)) event.preventDefault(); }}
      onBlur={onBlur} aria-invalid={invalid || undefined} className="tabular-nums" />
  </InputGroup>;
}
