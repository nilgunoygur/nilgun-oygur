import type { CSSProperties, ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "react-email";

// Site palette (app/globals.css). Email clients ignore web fonts often, so the stacks fall back safely.
export const colors = {
  page: "#f1f5e9",
  card: "#ffffff",
  panel: "#f7f9f2",
  ink: "#30302e",
  muted: "#64645f",
  forest: "#224c40",
  sage: "#dcebb9",
  border: "#e3e9d6",
};
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const serif = "Georgia, 'Times New Roman', serif";

export const text: CSSProperties = { margin: "0 0 16px", fontFamily: sans, fontSize: 16, lineHeight: "26px", color: colors.ink };
export const small: CSSProperties = { ...text, fontSize: 13, lineHeight: "20px", color: colors.muted };

/** Shared frame for every Akademi email: wordmark, white card, and a quiet footer. */
export function EmailLayout({ preview, eyebrow = "AKADEMİ", siteUrl, footer, children }: {
  preview: string;
  eyebrow?: string;
  siteUrl: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang="tr" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Body style={{ margin: 0, padding: 0, backgroundColor: colors.page, fontFamily: sans, color: colors.ink }}>
        <Preview>{preview}</Preview>
        <Container style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: "40px 16px" }}>
          <Section style={{ padding: "0 8px 20px" }}>
            <Text style={{ margin: 0, fontFamily: serif, fontSize: 22, lineHeight: "28px", fontWeight: 700, color: colors.forest }}>
              Nilgün Oygur
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: "2px", color: colors.muted }}>&nbsp;&nbsp;{eyebrow}</span>
            </Text>
          </Section>
          <Section style={{ backgroundColor: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: "40px 36px" }}>
            {children}
          </Section>
          <Section style={{ padding: "24px 16px 0", textAlign: "center" }}>
            <Text style={{ ...small, fontSize: 12, margin: "0 0 8px" }}>{footer}</Text>
            <Text style={{ ...small, fontSize: 12, margin: 0 }}>
              <Link href={siteUrl} style={{ color: colors.muted, textDecoration: "underline" }}>{new URL(siteUrl).host}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Heading as="h1" style={{ margin: "0 0 16px", fontFamily: serif, fontSize: 28, lineHeight: "36px", fontWeight: 700, color: colors.ink }}>{children}</Heading>;
}

export function ActionButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "28px 0" }}>
      <Button href={href} style={{ display: "inline-block", backgroundColor: colors.forest, color: "#ffffff", fontFamily: sans, fontSize: 16, fontWeight: 600, lineHeight: "24px", textDecoration: "none", borderRadius: 999, padding: "14px 28px" }}>
        {children}
      </Button>
    </Section>
  );
}

/** Some clients strip buttons; the raw URL keeps the action usable. */
export function LinkFallback({ url }: { url: string }) {
  return (
    <Section style={{ margin: "8px 0 0" }}>
      <Text style={{ ...small, margin: "0 0 6px" }}>Düğme çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:</Text>
      <Text style={{ ...small, margin: 0, wordBreak: "break-all" }}>
        <Link href={url} style={{ color: colors.forest, textDecoration: "underline" }}>{url}</Link>
      </Text>
    </Section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <Section style={{ marginTop: 28, backgroundColor: colors.panel, borderLeft: `3px solid ${colors.sage}`, borderRadius: 8, padding: "14px 16px" }}>
      <Text style={{ ...small, margin: 0 }}>{children}</Text>
    </Section>
  );
}
