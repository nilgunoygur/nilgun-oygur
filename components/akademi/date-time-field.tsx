"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import { TimePicker, TimePickerColumns, TimePickerPanel } from "@/components/reui/time-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ControlledField, type Controlled } from "./form-fields";

const placeholder = "Tarih ve saat seçin";
const timeI18n = { labels: { hour: "Saat", minute: "Dakika", panelLabel: "Saat seçin" } };
const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

/** Holds a wall-clock `yyyy-MM-ddTHH:mm` string, empty when unset. */
export function DateTimeField<T extends FieldValues, U = T>({ className, ...frame }: Controlled<T, U> & { className?: string }) {
  const [open, setOpen] = useState(false);
  return <ControlledField {...frame}>
    {(field, id, invalid) => {
      const [day, time]: string[] = field.value ? field.value.split("T") : [];
      const selected = field.value ? parseISO(field.value) : undefined;
      return <Popover open={open} onOpenChange={next => { setOpen(next); if (!next) field.onBlur(); }}>
        <PopoverTrigger render={<Button type="button" variant="outline" id={id} ref={field.ref} className={cn("h-(--control-h) w-full justify-start font-normal", !field.value && "text-muted-foreground", className)} aria-invalid={invalid} />}>
          <CalendarClock data-icon="inline-start" />{selected ? format(selected, "d MMM yyyy · HH:mm", { locale: tr }) : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" aria-label={placeholder} className="w-auto gap-0 p-0">
          <div className="flex flex-col items-center gap-3 p-3 sm:flex-row sm:items-start">
            <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={next => { if (next) field.onChange(`${dayKey(next)}T${time ?? "09:00"}`); }} locale={tr} />
            <div className="flex justify-center self-stretch max-sm:border-t max-sm:pt-3 sm:border-s sm:ps-3">
              <TimePicker value={time ?? null} onValueChange={next => { if (next) field.onChange(`${day ?? dayKey(new Date())}T${next}`); }} minuteStep={5} i18n={timeI18n}>
                <TimePickerPanel className="[--time-picker-rows:7]"><TimePickerColumns /></TimePickerPanel>
              </TimePicker>
            </div>
          </div>
          <div className="flex justify-between border-t p-2">
            <Button type="button" variant="ghost" size="sm" disabled={!field.value} onClick={() => field.onChange("")}>Temizle</Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>Tamam</Button>
          </div>
        </PopoverContent>
      </Popover>;
    }}
  </ControlledField>;
}
