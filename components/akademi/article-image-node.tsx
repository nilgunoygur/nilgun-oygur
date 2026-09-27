"use client";

import { useEffect } from "react";
import { $getNodeByKey, $getSelection, $isNodeSelection, COMMAND_PRIORITY_LOW, DecoratorNode, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, type DOMConversionMap, type DOMExportOutput, type NodeKey, type SerializedLexicalNode, type Spread } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { cn } from "@/lib/utils";

// Exports a plain <img>, the only image markup cleanArticleHtml keeps.

type SerializedArticleImage = Spread<{ src: string; alt: string }, SerializedLexicalNode>;

export class ArticleImageNode extends DecoratorNode<React.ReactNode> {
  __src: string;
  __alt: string;

  static getType() { return "article-image"; }
  static clone(node: ArticleImageNode) { return new ArticleImageNode(node.__src, node.__alt, node.__key); }
  static importJSON(json: SerializedArticleImage) { return $createArticleImageNode(json.src, json.alt); }
  static importDOM(): DOMConversionMap {
    return { img: () => ({ conversion: element => ({ node: $createArticleImageNode(element.getAttribute("src") ?? "", element.getAttribute("alt") ?? "") }), priority: 0 }) };
  }

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  exportJSON(): SerializedArticleImage { return { ...super.exportJSON(), type: "article-image", version: 1, src: this.__src, alt: this.__alt }; }
  exportDOM(): DOMExportOutput {
    const image = document.createElement("img");
    image.setAttribute("src", this.__src);
    image.setAttribute("alt", this.__alt);
    return { element: image };
  }
  createDOM() { const element = document.createElement("div"); element.className = "my-6"; return element; }
  updateDOM() { return false; }
  isInline() { return false; }
  decorate() { return <ArticleImage nodeKey={this.getKey()} src={this.__src} alt={this.__alt} />; }
}

export function $createArticleImageNode(src: string, alt: string) { return new ArticleImageNode(src, alt); }

function ArticleImage({ nodeKey, src, alt }: { nodeKey: NodeKey; src: string; alt: string }) {
  const [editor] = useLexicalComposerContext();
  const [selected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  useEffect(() => {
    const remove = (event: KeyboardEvent) => {
      const selection = $getSelection();
      if (!$isNodeSelection(selection) || !selection.has(nodeKey)) return false;
      event.preventDefault();
      $getNodeByKey(nodeKey)?.remove();
      return true;
    };
    return mergeRegister(
      editor.registerCommand(KEY_BACKSPACE_COMMAND, remove, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_DELETE_COMMAND, remove, COMMAND_PRIORITY_LOW),
    );
  }, [editor, nodeKey]);

  // eslint-disable-next-line @next/next/no-img-element -- rendered exactly as published
  return <img src={src} alt={alt} draggable={false} onClick={event => { if (!event.shiftKey) clearSelection(); setSelected(true); }}
    className={cn("mx-auto max-h-[520px] w-full cursor-pointer rounded-2xl object-cover transition-shadow", selected && "ring-3 ring-primary ring-offset-2")} />;
}
