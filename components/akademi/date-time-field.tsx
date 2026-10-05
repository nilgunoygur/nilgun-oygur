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

const timeLabels = { hour: "Saat", minute: "Dakika", panelLabel: "Saat seçin" };

/** A wall-clock `yyyy-MM-ddTHH:mm` value, the format `<input type="datetime-local">` uses; empty when unset. */
export function DateTimeField<T extends FieldValues, U = T>({ placeholder = "Tarih ve saat seçin", className, ...frame }: Controlled<T, U> & { placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <ControlledField {...frame}>
    {(field, id, invalid) => {
      const [day, time] = field.value ? String(field.value).split("T") : [];
      const selected = day ? parseISO(day) : undefined;
      return <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" id={id} ref={field.ref} onBlur={field.onBlur} className={cn("h-(--control-h) w-full justify-start font-normal", !field.value && "text-muted-foreground", className)} aria-invalid={invalid} />}>
          <CalendarClock data-icon="inline-start" />{field.value ? format(parseISO(field.value), "d MMM yyyy · HH:mm", { locale: tr }) : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto gap-0 p-0">
          <div className="flex flex-col items-center gap-3 p-3 sm:flex-row sm:items-start">
            <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={next => { if (next) field.onChange(`${format(next, "yyyy-MM-dd")}T${time ?? "09:00"}`); }} locale={tr} />
            <div className="flex justify-center self-stretch max-sm:border-t max-sm:pt-3 sm:border-s sm:ps-3">
              <TimePicker aria-label="Başlangıç saati" value={time ?? null} onValueChange={next => { if (next) field.onChange(`${day ?? format(new Date(), "yyyy-MM-dd")}T${next}`); }} minuteStep={5} i18n={{ labels: timeLabels }}>
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
