"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import { $createParagraphNode, $getRoot, FORMAT_TEXT_COMMAND, type LexicalEditor } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { BOLD_ITALIC_STAR, BOLD_STAR, INLINE_CODE, ITALIC_STAR, LINK, ORDERED_LIST, QUOTE, STRIKETHROUGH, UNORDERED_LIST, type ElementTransformer, type Transformer } from "@lexical/markdown";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { $createHorizontalRuleNode, HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { Heading2, Heading3, ImagePlus, Link2, Minus, Quote, type LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArticleImageNode } from "./article-image-node";
import { ArticleToolbar, ImageDialog, LinkForm, ToolButton, blocks, insertDivider, insertImage, marks, normalizeUrl, setBlock, useFormatState, type FormatState } from "./article-editor-toolbar";
import type { ImageChoice, UploadImage } from "./image-library";

// Emits HTML; the server keeps only what cleanArticleHtml allows.

const theme = {
  paragraph: "mb-4 leading-7",
  heading: { h2: "mb-4 mt-8 font-display text-3xl", h3: "mb-3 mt-6 font-display text-2xl", h4: "mb-3 mt-5 text-lg font-semibold" },
  quote: "my-5 border-l-4 border-mint pl-4 italic text-stone",
  list: { ul: "mb-4 list-disc pl-6", ol: "mb-4 list-decimal pl-6", listitem: "mb-1", nested: { listitem: "list-none" } },
  link: "text-primary underline underline-offset-2",
  hr: "my-8 border-t border-forest/15 [&.selected]:border-primary",
  text: { bold: "font-bold", italic: "italic", underline: "underline", strikethrough: "line-through", underlineStrikethrough: "[text-decoration:underline_line-through]", code: "rounded bg-mist px-1.5 py-0.5 font-mono text-[0.9em]" },
};

const HEADING: ElementTransformer = {
  type: "element", dependencies: [HeadingNode], regExp: /^(#{2,4})\s/, export: () => null,
  replace: (parent, children, match) => { const node = $createHeadingNode(`h${match[1].length}` as "h2" | "h3" | "h4"); node.append(...children); parent.replace(node); node.select(0, 0); },
};
const DIVIDER: ElementTransformer = {
  type: "element", dependencies: [HorizontalRuleNode], regExp: /^(---|\*\*\*)\s?$/, export: () => null,
  replace: (parent, _children, _match, isImport) => { const line = $createHorizontalRuleNode(); if (isImport || parent.getNextSibling()) parent.replace(line); else parent.insertBefore(line); line.selectNext(); },
};
const transformers: Transformer[] = [HEADING, QUOTE, UNORDERED_LIST, ORDERED_LIST, DIVIDER, BOLD_ITALIC_STAR, BOLD_STAR, ITALIC_STAR, STRIKETHROUGH, INLINE_CODE, LINK];

export function ArticleRichEditor({ initialHtml, onChange, images, upload }: { initialHtml: string; onChange: (html: string) => void; images: ImageChoice[]; upload: UploadImage }) {
  const config = {
    namespace: "academy-article-editor",
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, HorizontalRuleNode, ArticleImageNode],
    theme,
    onError: (error: Error) => { throw error; },
    editorState: (editor: LexicalEditor) => {
      if (typeof DOMParser === "undefined" || !initialHtml.trim()) return;
      const doc = new DOMParser().parseFromString(initialHtml, "text/html");
      const root = $getRoot();
      root.clear();
      root.append(...$generateNodesFromDOM(editor, doc));
      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
    },
  };

  return <LexicalComposer initialConfig={config}><EditorShell onChange={onChange} images={images} upload={upload} /></LexicalComposer>;
}

function EditorShell({ onChange, images, upload }: { onChange: (html: string) => void; images: ImageChoice[]; upload: UploadImage }) {
  const [editor] = useLexicalComposerContext();
  const format = useFormatState();
  const [imageOpen, setImageOpen] = useState(false);
  const [words, setWords] = useState(0);

  return <>
    <div className="rounded-xl border border-input bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <ArticleToolbar state={format} onImage={() => setImageOpen(true)} />
      <div className="relative px-6 py-6 sm:px-10">
        <RichTextPlugin contentEditable={<ContentEditable aria-label="Yazı içeriği" className="mx-auto min-h-96 max-w-[72ch] text-[16px] text-foreground outline-none" />}
          placeholder={<p className="pointer-events-none absolute top-6 left-6 text-sm text-muted-foreground sm:left-10">Yazmaya başlayın veya blok eklemek için “/” yazın…</p>} ErrorBoundary={LexicalErrorBoundary} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>“/” ile blok ekleyin · <kbd className="font-mono">##</kbd> başlık · <kbd className="font-mono">-</kbd> liste · <kbd className="font-mono">&gt;</kbd> alıntı · <kbd className="font-mono">**kalın**</kbd> · <kbd className="font-mono">---</kbd> ayraç</span>
        <span>{words.toLocaleString("tr-TR")} kelime · yaklaşık {Math.max(1, Math.round(words / 200))} dk. okuma</span>
      </div>
    </div>
    <HistoryPlugin />
    <ListPlugin />
    <LinkPlugin validateUrl={url => normalizeUrl(url) !== null} />
    <HorizontalRulePlugin />
    <TabIndentationPlugin maxIndent={3} />
    <MarkdownShortcutPlugin transformers={transformers} />
    <SlashMenu onImage={() => setImageOpen(true)} />
    <SelectionBar state={format} />
    <ImageDialog open={imageOpen} onOpenChange={setImageOpen} images={images} upload={upload} onInsert={(src, alt) => insertImage(editor, src, alt)} />
    <OnChangePlugin ignoreSelectionChange onChange={(state, current) => state.read(() => {
      onChange($generateHtmlFromNodes(current));
      const text = $getRoot().getTextContent().trim();
      setWords(text ? text.split(/\s+/).length : 0);
    })} />
  </>;
}

class SlashOption extends MenuOption {
  constructor(readonly label: string, readonly Icon: LucideIcon, readonly keywords: string, readonly run: (editor: LexicalEditor) => void) { super(label); }
}

function SlashMenu({ onImage }: { onImage: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const triggerFn = useBasicTypeaheadTriggerMatch("/", { minLength: 0 });
  const search = (query ?? "").toLocaleLowerCase("tr-TR");
  const options = [
    ...blocks.map(block => new SlashOption(block.label, block.icon, block.keywords, current => setBlock(current, block.value))),
    new SlashOption("Görsel", ImagePlus, "görsel gorsel resim fotoğraf image", onImage),
    new SlashOption("Ayraç", Minus, "ayraç ayrac çizgi divider", insertDivider),
  ].filter(option => `${option.label} ${option.keywords}`.toLocaleLowerCase("tr-TR").includes(search));

  return <LexicalTypeaheadMenuPlugin<SlashOption> options={options} onQueryChange={setQuery} triggerFn={triggerFn}
    onSelectOption={(option, textNode, closeMenu) => { editor.update(() => { textNode?.remove(); option.run(editor); closeMenu(); }); }}
    menuRenderFn={(anchor, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => anchor.current && options.length ? createPortal(
      <div role="listbox" aria-label="Blok ekle" className="mt-7 w-60 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-[0_12px_40px_-12px_rgba(34,76,64,0.35)]">
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.12em] text-stone">BLOK EKLE</p>
        {options.map((option, index) => <button type="button" role="option" aria-selected={selectedIndex === index} key={option.key} ref={element => option.setRefElement(element)}
          onMouseEnter={() => setHighlightedIndex(index)} onClick={() => selectOptionAndCleanUp(option)}
          className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm", selectedIndex === index ? "bg-mist text-forest" : "text-foreground")}>
          <span className="flex size-7 items-center justify-center rounded-md border border-border bg-white [&_svg]:size-4"><option.Icon /></span>{option.label}
        </button>)}
      </div>, anchor.current) : null} />;
}

/** Format bar over the selected text. */
function SelectionBar({ state }: { state: FormatState }) {
  const [editor] = useLexicalComposerContext();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [linking, setLinking] = useState(false);

  // While the link input has focus the DOM selection is elsewhere; keep the bar where it was.
  const update = useEffectEvent(() => {
    if (linking) return;
    const root = editor.getRootElement();
    const native = window.getSelection();
    if (!root || !native || native.isCollapsed || native.rangeCount === 0 || !root.contains(native.anchorNode)) return setRect(null);
    const next = native.getRangeAt(0).getBoundingClientRect();
    setRect(next.width ? next : null);
  });
  useEffect(() => {
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { document.removeEventListener("selectionchange", update); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, []);

  if (!rect || (state.collapsed && !linking)) return null;
  const below = rect.top < 170;
  return createPortal(<div role="toolbar" aria-label="Seçili metni biçimlendir" style={{ top: below ? rect.bottom + 10 : rect.top - 50, left: Math.min(Math.max(rect.left + rect.width / 2, 180), window.innerWidth - 180) }}
    className="fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-white p-1 shadow-[0_12px_40px_-12px_rgba(34,76,64,0.4)]">
    {linking ? <LinkForm initial={state.link} onDone={() => setLinking(false)} /> : <>
      <ToolButton label="Başlık 2" active={state.block === "h2"} onClick={() => setBlock(editor, "h2", state.block)}><Heading2 /></ToolButton>
      <ToolButton label="Başlık 3" active={state.block === "h3"} onClick={() => setBlock(editor, "h3", state.block)}><Heading3 /></ToolButton>
      <ToolButton label="Alıntı" active={state.block === "quote"} onClick={() => setBlock(editor, "quote", state.block)}><Quote /></ToolButton>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      {marks.map(mark => <ToolButton key={mark.format} label={mark.label} active={state.formats.includes(mark.format)} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, mark.format)}><mark.icon /></ToolButton>)}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <ToolButton label="Bağlantı" active={Boolean(state.link)} onClick={() => setLinking(true)}><Link2 /></ToolButton>
    </>}
  </div>, document.body);
}
