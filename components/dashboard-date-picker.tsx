"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "date-fns/locale";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { Period } from "@/lib/akademi/dashboard";

const dateLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
const isoDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Istanbul" }).format(date);
const calendarDay = (value: string) => new Date(`${value}T12:00:00+03:00`);
const labels: Record<Period, string> = { week: "Hafta", month: "Ay", year: "Yıl", custom: "Özel tarih" };

export function DashboardDatePicker({ period, from, to, today }: { period: Period; from: string; to: string; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(period === "custom");
  const [selected, setSelected] = useState<DateRange | undefined>({ from: calendarDay(from), to: calendarDay(to) });
  const navigate = (next: string) => { setOpen(false); router.push(next); };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button variant="outline" size="pill" className="border-forest/10 bg-mist text-forest hover:bg-mist/80" />}>
      <CalendarDays className="size-4" />
      <span className="max-sm:hidden">{labels[period]} · </span>{dateLabel.format(calendarDay(from))} – {dateLabel.format(calendarDay(to))}
      <ChevronDown className="size-3.5 opacity-60" />
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[390px] max-w-[calc(100vw-2rem)] rounded-2xl p-4">
      <PopoverHeader><PopoverTitle className="!font-sans !text-sm !leading-5 !tracking-normal">Tarih aralığı</PopoverTitle></PopoverHeader>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-mist p-1">
        {(["week", "month", "year", "custom"] as const).map(item => <Button key={item} variant={(custom ? item === "custom" : item === period) ? "default" : "ghost"} size="sm" className="min-h-9 min-w-0 rounded-lg px-1" onClick={() => {
          if (item === "custom") { setCustom(true); return; }
          setCustom(false); navigate(`/yonetim?period=${item}`);
        }}>{labels[item]}</Button>)}
      </div>
      {custom && <>
        <Calendar mode="range" required={false} locale={tr} timeZone="Europe/Istanbul" selected={selected} onSelect={setSelected} disabled={{ after: calendarDay(today) }} numberOfMonths={1} className="w-full px-0 py-4" classNames={{ root: "w-full", months: "w-full", month: "w-full", month_grid: "w-full" }} />
        <Button className="w-full" disabled={!selected?.from || !selected?.to} onClick={() => { if (selected?.from && selected.to) navigate(`/yonetim?period=custom&from=${isoDay(selected.from)}&to=${isoDay(selected.to)}`); }}>Uygula</Button>
      </>}
    </PopoverContent>
  </Popover>;
}
