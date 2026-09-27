import { ActionButton, EmailLayout, LinkFallback, Paragraph, Small } from "./layout.tsx";

export type AuthCopy = {
  subject: string;
  preview: string;
  hero: { file: string; alt: string };
  kicker: string;
  title: [lead: string, accent: string];
  body: string;
  action: string;
  notes: string[];
  checklist: { title: string; items: string[] };
  footnote: string;
};

export function authEmailText(copy: AuthCopy, url: string) {
  return [copy.title.join(" "), copy.body, `${copy.action}:\n${url}`, ...copy.notes, ...copy.checklist.items, "Nilgün Oygur Akademi"].join("\n\n");
}

export function AuthEmail({ copy, url }: { copy: AuthCopy; url: string }) {
  const siteUrl = new URL(url).origin;
  return (
    <EmailLayout
      preview={copy.preview}
      siteUrl={siteUrl}
      hero={copy.hero}
      headerLink={{ label: "Akademi", href: `${siteUrl}/akademi` }}
      kicker={copy.kicker}
      title={copy.title}
      checklist={copy.checklist}
      footnote={copy.footnote}
    >
      <Paragraph>{copy.body}</Paragraph>
      <ActionButton href={url}>{copy.action}</ActionButton>
      {copy.notes.map(note => <Small key={note}>{note}</Small>)}
      <LinkFallback url={url} />
    </EmailLayout>
  );
}
