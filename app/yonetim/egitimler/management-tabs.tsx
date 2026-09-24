"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CourseManagementTabs({ courses, sales, attention, saleCount, attentionCount }: {
  courses: ReactNode;
  sales: ReactNode;
  attention: ReactNode;
  saleCount: number;
  attentionCount: number;
}) {
  return <Tabs defaultValue="courses" className="gap-6">
    <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-forest/10 bg-white p-1 sm:w-fit">
      <TabsTrigger value="courses" className="px-4 py-2.5">Eğitimler</TabsTrigger>
      <TabsTrigger value="sales" className="px-4 py-2.5">Satışlar <span className="ml-1 text-xs text-muted-foreground">{saleCount}</span></TabsTrigger>
      {attentionCount > 0 && <TabsTrigger value="attention" className="px-4 py-2.5">İşlem bekleyenler <span className="ml-1 text-xs text-destructive">{attentionCount}</span></TabsTrigger>}
    </TabsList>
    <TabsContent value="courses">{courses}</TabsContent>
    <TabsContent value="sales">{sales}</TabsContent>
    {attentionCount > 0 && <TabsContent value="attention">{attention}</TabsContent>}
  </Tabs>;
}
