"use client";

import { useEffect, useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  $createParagraphNode, $getRoot, $getSelection, $isElementNode, $isRangeSelection, $isTextNode, $setSelection,
  CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_LOW, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND,
  type ElementFormatType, type LexicalEditor, type TextFormatType,
} from "lexical";
import { $isLinkNode, $toggleLink } from "@lexical/link";
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent, $getNearestNodeOfType, $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, ChevronDown, Code, Heading2, Heading3, Heading4, ImagePlus, Italic, Link2,
  List, ListOrdered, Minus, Pilcrow, Quote, Redo2, RemoveFormatting, Strikethrough, Underline, Undo2, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { imageInsertSchema, linkSchema } from "@/lib/akademi/owner-forms";
import { $createArticleImageNode } from "./article-image-node";
import { TextField } from "./form-fields";
import { ImageLibrary, ImageUploadButton, imageRules, type ImageChoice, type UploadImage } from "./image-library";

type Block = "paragraph" | "h2" | "h3" | "h4" | "quote" | "bullet" | "number";

export const blocks: { value: Block; label: string; icon: LucideIcon; keywords: string }[] = [
  { value: "paragraph", label: "Paragraf", icon: Pilcrow, keywords: "metin paragraf text" },
  { value: "h2", label: "Başlık 2", icon: Heading2, keywords: "başlık baslik heading h2" },
  { value: "h3", label: "Başlık 3", icon: Heading3, keywords: "başlık baslik heading h3" },
  { value: "h4", label: "Başlık 4", icon: Heading4, keywords: "başlık baslik heading h4" },
  { value: "quote", label: "Alıntı", icon: Quote, keywords: "alıntı alinti quote" },
  { value: "bullet", label: "Madde listesi", icon: List, keywords: "liste madde bullet list" },
  { value: "number", label: "Numaralı liste", icon: ListOrdered, keywords: "liste numara ordered list" },
];
const alignments: { value: ElementFormatType; label: string; icon: LucideIcon }[] = [
  { value: "left", label: "Sola hizala", icon: AlignLeft },
  { value: "center", label: "Ortala", icon: AlignCenter },
  { value: "right", label: "Sağa hizala", icon: AlignRight },
  { value: "justify", label: "İki yana yasla", icon: AlignJustify },
];
export const marks: { format: TextFormatType; label: string; icon: LucideIcon; shortcut?: string }[] = [
  { format: "bold", label: "Kalın", icon: Bold, shortcut: "⌘B" },
  { format: "italic", label: "İtalik", icon: Italic, shortcut: "⌘I" },
  { format: "underline", label: "Altı çizili", icon: Underline, shortcut: "⌘U" },
  { format: "strikethrough", label: "Üstü çizili", icon: Strikethrough },
  { format: "code", label: "Satır içi kod", icon: Code },
];

export function setBlock(editor: LexicalEditor, block: Block, current?: Block) {
  if (block === "bullet" || block === "number") {
    if (current === block) return setBlock(editor, "paragraph");
    editor.dispatchCommand(block === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined);
    return;
  }
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const next = current === block && block !== "paragraph" ? "paragraph" : block;
    $setBlocksType(selection, () => next === "quote" ? $createQuoteNode() : next === "paragraph" ? $createParagraphNode() : $createHeadingNode(next));
  });
}

export function insertImage(editor: LexicalEditor, src: string, alt: string) {
  editor.update(() => {
    if (!$getSelection()) $getRoot().selectEnd();
    $insertNodeToNearestRoot($createArticleImageNode(src, alt));
  });
}

export function insertDivider(editor: LexicalEditor) { editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined); }

function clearFormatting(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    for (const node of selection.getNodes()) if ($isTextNode(node)) { node.setFormat(0); node.setStyle(""); }
    $toggleLink(null);
  });
}

/** Bare domains become https links and e-mail addresses mailto links. */
export function normalizeUrl(value: string) {
  const url = value.trim();
  if (!url) return null;
  if (/^(https?:|mailto:)/i.test(url) || url.startsWith("/") || url.startsWith("#")) return url;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

export type FormatState = { block: Block; formats: TextFormatType[]; link: string | null; align: ElementFormatType; collapsed: boolean };
const emptyState: FormatState = { block: "paragraph", formats: [], link: null, align: "left", collapsed: true };

function readFormatState(): FormatState {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return emptyState;
  const anchor = selection.anchor.getNode();
  const element = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();
  const link = $findMatchingParent(anchor, $isLinkNode);
  const block: Block = $isListNode(element) ? (($getNearestNodeOfType(anchor, ListNode) ?? element).getListType() === "number" ? "number" : "bullet")
    : $isHeadingNode(element) ? element.getTag() as Block : $isQuoteNode(element) ? "quote" : "paragraph";
  return {
    block,
    formats: marks.map(mark => mark.format).filter(format => selection.hasFormat(format)),
    link: $isLinkNode(link) ? link.getURL() : null,
    align: ($isElementNode(element) && element.getFormatType()) || "left",
    collapsed: selection.isCollapsed(),
  };
}

/** The current selection's formatting; re-renders only when it changes. */
export function useFormatState() {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState(emptyState);
  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    const next = editorState.read(readFormatState);
    setState(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  }), [editor]);
  return state;
}

/** Submits this form only: React bubbles events through portals, and these forms sit inside the article form. */
const isolated = (submit: (event?: FormEvent) => Promise<void>) => (event: FormEvent) => { event.stopPropagation(); void submit(event); };

/** Focus leaves the editor while typing a URL, so the selection is saved on open and restored on save. */
export function LinkForm({ initial, onDone }: { initial: string | null; onDone: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [saved] = useState(() => editor.getEditorState().read(() => $getSelection()?.clone() ?? null));
  const form = useForm({ resolver: zodResolver(linkSchema), defaultValues: { url: initial ?? "" } });
  const apply = (url: string | null) => {
    editor.update(() => {
      if (saved) $setSelection(saved.clone());
      $toggleLink(url);
    });
    onDone();
    editor.focus();
  };
  return <form className="flex items-start gap-1.5" noValidate onSubmit={isolated(form.handleSubmit(({ url }) => apply(normalizeUrl(url))))}>
    <Controller control={form.control} name="url" render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid} className="w-60 gap-1">
        <Input {...field} autoFocus placeholder="ornek.com veya /blog/yazi" aria-label="Bağlantı adresi" aria-invalid={fieldState.invalid} className="h-8 text-sm"
          onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onDone(); editor.focus(); } }} />
        {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-xs" />}
      </Field>
    )} />
    <Button type="submit" size="icon-sm" aria-label="Bağlantıyı kaydet"><Check /></Button>
    {initial && <Button type="button" size="sm" variant="ghost" onClick={() => apply(null)}>Kaldır</Button>}
  </form>;
}

export function ToolButton({ label, active, className, ...props }: React.ComponentProps<typeof Button> & { label: string; active?: boolean }) {
  return <Button type="button" size="icon" variant="ghost" aria-label={label} title={label} aria-pressed={active} onMouseDown={event => event.preventDefault()}
    className={cn("text-stone hover:text-forest", active && "bg-mist text-forest", className)} {...props} />;
}

export function ArticleToolbar({ state, onImage }: { state: FormatState; onImage: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [linkOpen, setLinkOpen] = useState(false);
  useEffect(() => mergeRegister(
    editor.registerCommand(CAN_UNDO_COMMAND, undo => { setHistory(current => ({ ...current, undo })); return false; }, COMMAND_PRIORITY_LOW),
    editor.registerCommand(CAN_REDO_COMMAND, redo => { setHistory(current => ({ ...current, redo })); return false; }, COMMAND_PRIORITY_LOW),
  ), [editor]);
  const current = blocks.find(item => item.value === state.block) ?? blocks[0];
  const align = alignments.find(item => item.value === state.align) ?? alignments[0];
  const divider = <Separator orientation="vertical" className="mx-1 h-5" />;

  return <div role="toolbar" aria-label="Yazı biçimlendirme" className="sticky top-[calc(96px+var(--announcement-offset,0px))] z-20 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-white/95 p-1.5 backdrop-blur max-tablet:top-[calc(86px+var(--announcement-offset,0px))]">
    <ToolButton label="Geri al (⌘Z)" disabled={!history.undo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}><Undo2 /></ToolButton>
    <ToolButton label="Yinele (⇧⌘Z)" disabled={!history.redo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}><Redo2 /></ToolButton>
    {divider}
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" size="sm" variant="ghost" className="min-w-36 justify-between text-forest" onMouseDown={event => event.preventDefault()} />} aria-label="Blok türü"><span className="flex items-center gap-2"><current.icon />{current.label}</span><ChevronDown className="opacity-60" /></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">{blocks.map(item => <DropdownMenuItem key={item.value} onClick={() => setBlock(editor, item.value, state.block)}><item.icon />{item.label}{item.value === state.block && <Check className="ml-auto" />}</DropdownMenuItem>)}</DropdownMenuContent>
    </DropdownMenu>
    {divider}
    {marks.map(mark => <ToolButton key={mark.format} label={mark.shortcut ? `${mark.label} (${mark.shortcut})` : mark.label} active={state.formats.includes(mark.format)} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, mark.format)}><mark.icon /></ToolButton>)}
    <Popover open={linkOpen} onOpenChange={setLinkOpen}>
      <PopoverTrigger render={<ToolButton label="Bağlantı" active={Boolean(state.link)} />}><Link2 /></PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">{linkOpen && <LinkForm initial={state.link} onDone={() => setLinkOpen(false)} />}</PopoverContent>
    </Popover>
    {divider}
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" size="sm" variant="ghost" className="text-stone hover:text-forest" onMouseDown={event => event.preventDefault()} />} aria-label="Hizalama" title="Hizalama"><align.icon /><ChevronDown className="opacity-60" /></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">{alignments.map(item => <DropdownMenuItem key={item.value} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, item.value)}><item.icon />{item.label}{item.value === state.align && <Check className="ml-auto" />}</DropdownMenuItem>)}</DropdownMenuContent>
    </DropdownMenu>
    <ToolButton label="Madde listesi" active={state.block === "bullet"} onClick={() => setBlock(editor, "bullet", state.block)}><List /></ToolButton>
    <ToolButton label="Numaralı liste" active={state.block === "number"} onClick={() => setBlock(editor, "number", state.block)}><ListOrdered /></ToolButton>
    <ToolButton label="Alıntı" active={state.block === "quote"} onClick={() => setBlock(editor, "quote", state.block)}><Quote /></ToolButton>
    {divider}
    <ToolButton label="Görsel ekle" onClick={onImage}><ImagePlus /></ToolButton>
    <ToolButton label="Ayraç ekle" onClick={() => insertDivider(editor)}><Minus /></ToolButton>
    {divider}
    <ToolButton label="Biçimi temizle" onClick={() => clearFormatting(editor)}><RemoveFormatting /></ToolButton>
  </div>;
}

export function ImageDialog({ open, onOpenChange, images, upload, onInsert }: { open: boolean; onOpenChange: (open: boolean) => void; images: ImageChoice[]; upload: UploadImage; onInsert: (src: string, alt: string) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Görsel ekle</DialogTitle><DialogDescription>Kütüphaneden seçin veya yeni bir görsel yükleyin. {imageRules}</DialogDescription></DialogHeader>
      {/* Mounted only while open, so each opening starts with a fresh choice. */}
      {open && <ImagePicker images={images} upload={upload} onInsert={(src, alt) => { onInsert(src, alt); onOpenChange(false); }} />}
    </DialogContent>
  </Dialog>;
}

function ImagePicker({ images, upload, onInsert }: { images: ImageChoice[]; upload: UploadImage; onInsert: (src: string, alt: string) => void }) {
  const form = useForm({ resolver: zodResolver(imageInsertSchema), defaultValues: { src: "", alt: "" } });
  const choose = (choice: ImageChoice) => {
    form.setValue("src", choice.url, { shouldValidate: true });
    if (!form.getValues("alt")) form.setValue("alt", choice.name.replace(/\.[a-z0-9]+$/i, ""));
  };
  return <form noValidate onSubmit={isolated(form.handleSubmit(({ src, alt }) => onInsert(src, alt)))}><FieldGroup className="gap-5">
    <div className="flex justify-end"><ImageUploadButton upload={upload} onUploaded={choose} label="Görsel yükle">Yeni görsel yükle</ImageUploadButton></div>
    <Controller control={form.control} name="src" render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <ImageLibrary images={images} selected={field.value || null} onSelect={choose} label="Görsel kütüphanesi" className="max-h-[46vh] overflow-y-auto p-0.5 lg:grid-cols-3" />
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )} />
    <TextField control={form.control} name="alt" label="Açıklama (alt metin)" maxLength={160} placeholder="Görselde ne var?" />
    <DialogFooter><Button type="submit">Görseli ekle</Button></DialogFooter>
  </FieldGroup></form>;
}
