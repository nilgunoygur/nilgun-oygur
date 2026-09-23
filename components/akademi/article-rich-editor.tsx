"use client";

import { $createParagraphNode, $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { Bold, Heading2, Italic, List, ListOrdered, Pilcrow, Quote, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function ArticleRichEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const config = {
    namespace: "academy-article-editor",
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    theme: { paragraph: "mb-4", heading: { h2: "mb-4 mt-8 text-2xl font-semibold", h3: "mb-3 mt-6 text-xl font-semibold" }, text: { bold: "font-bold", italic: "italic", underline: "underline" }, list: { ul: "list-disc pl-6", ol: "list-decimal pl-6", listitem: "mb-1" }, quote: "border-l-4 border-mint pl-4 italic" },
    onError: (error: Error) => { throw error; },
    editorState: (editor: Parameters<typeof $generateNodesFromDOM>[0]) => {
      if (typeof DOMParser === "undefined" || !initialHtml.trim()) return;
      const doc = new DOMParser().parseFromString(initialHtml, "text/html");
      const root = $getRoot();
      root.clear();
      root.append(...$generateNodesFromDOM(editor, doc));
      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
    },
  };

  return <LexicalComposer initialConfig={config}>
    <div className="overflow-hidden rounded-xl border border-input bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <ArticleToolbar />
      <div className="relative px-5 py-5">
        <RichTextPlugin contentEditable={<ContentEditable aria-label="Yazı içeriği" className="min-h-72 outline-none [&_h2]:font-display [&_h2]:text-3xl [&_h3]:font-display [&_h3]:text-2xl [&_p]:leading-7" />} placeholder={<p className="pointer-events-none absolute top-5 left-5 text-sm text-muted-foreground">Yazınızı yazmaya başlayın…</p>} ErrorBoundary={LexicalErrorBoundary} />
      </div>
    </div>
    <HistoryPlugin />
    <ListPlugin />
    <OnChangePlugin ignoreSelectionChange onChange={(state, editor) => state.read(() => onChange($generateHtmlFromNodes(editor)))} />
  </LexicalComposer>;
}

function ArticleToolbar() {
  const [editor] = useLexicalComposerContext();
  const block = (kind: "paragraph" | "h2" | "quote") => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () => kind === "h2" ? $createHeadingNode("h2") : kind === "quote" ? $createQuoteNode() : $createParagraphNode());
    });
  };
  return <div role="toolbar" aria-label="Yazı biçimlendirme" className="flex flex-wrap items-center gap-1 border-b border-border p-2">
    <Button type="button" size="sm" variant="ghost" onClick={() => block("paragraph")} title="Paragraf"><Pilcrow /> <span className="max-sm:sr-only">Paragraf</span></Button>
    <Button type="button" size="icon" variant="ghost" onClick={() => block("h2")} aria-label="Ara başlık" title="Ara başlık"><Heading2 /></Button>
    <Button type="button" size="icon" variant="ghost" onClick={() => block("quote")} aria-label="Alıntı" title="Alıntı"><Quote /></Button>
    <Separator orientation="vertical" className="mx-1 h-6" />
    <Button type="button" size="icon" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} aria-label="Kalın" title="Kalın"><Bold /></Button>
    <Button type="button" size="icon" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} aria-label="İtalik" title="İtalik"><Italic /></Button>
    <Button type="button" size="icon" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} aria-label="Altı çizili" title="Altı çizili"><Underline /></Button>
    <Separator orientation="vertical" className="mx-1 h-6" />
    <Button type="button" size="icon" variant="ghost" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} aria-label="Madde işaretli liste" title="Madde işaretli liste"><List /></Button>
    <Button type="button" size="icon" variant="ghost" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} aria-label="Numaralı liste" title="Numaralı liste"><ListOrdered /></Button>
  </div>;
}
