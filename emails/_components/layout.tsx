import type { CSSProperties, ReactNode } from "react";
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "react-email";
import { nav, publicOrigin, socials } from "../../lib/site.ts";

// Light values mirror app/globals.css and survive Gmail/Outlook auto-inversion.
export const colors = { page: "#f5f5f7", card: "#ffffff", panel: "#dfeee5", ink: "#30302e", muted: "#6b6b68", teal: "#4b999c", forest: "#224c40", rule: "#e7e7e7" };
const dark = { page: "#0f1311", card: "#1a1f1c", panel: "#1f2c26", ink: "#eef0ec", muted: "#a7aea9", teal: "#7cc4c6", rule: "#2b332e" };
const darkText = { ink: dark.ink, muted: dark.muted, accent: dark.teal, link: dark.teal };
const darkTextRules = (prefix: string) => Object.entries(darkText).map(([name, color]) => `${prefix}.${name} { color: ${color} !important; }`).join("\n");

const sans = "'General Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const serif = "Recoleta, Georgia, 'Times New Roman', serif";

export const text: CSSProperties = { margin: "0 0 16px", fontFamily: sans, fontSize: 16, lineHeight: "26px", color: colors.ink };
const small: CSSProperties = { ...text, fontSize: 13, lineHeight: "20px", color: colors.muted };
export const kicker: CSSProperties = { margin: 0, fontFamily: sans, fontSize: 11, lineHeight: "18px", fontWeight: 600, letterSpacing: "1.8px", color: colors.ink };

const styles = `
@font-face { font-family: Recoleta; font-weight: 400; src: url(${publicOrigin}/email/recoleta.woff2) format("woff2"); }
@font-face { font-family: "General Sans"; font-weight: 400; src: url(${publicOrigin}/fonts/general-400.woff2) format("woff2"); }
@font-face { font-family: "General Sans"; font-weight: 600; src: url(${publicOrigin}/fonts/general-600.woff2) format("woff2"); }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .page, .page > table > tbody > tr > td { background-color: ${dark.page} !important; }
  .card { background-color: ${dark.card} !important; border-color: ${dark.rule} !important; }
  .panel { background-color: ${dark.panel} !important; }
  .button { background-color: ${dark.teal} !important; color: ${dark.page} !important; }
  .rule { border-color: ${dark.rule} !important; }
${darkTextRules("")}
}
${darkTextRules("[data-ogsc] ")}
@media only screen and (max-width: 600px) {
  .shell { padding: 16px 10px 32px !important; }
  .content { padding: 30px 22px 32px !important; }
  .aside { padding: 24px 22px !important; }
  .title { font-size: 31px !important; line-height: 38px !important; }
  .hero { width: 100% !important; height: auto !important; }
  .button { display: block !important; text-align: center !important; }
}`;

type LayoutProps = {
  preview: string;
  siteUrl: string;
  hero: { file: string; alt: string };
  headerLink: { label: string; href: string };
  kicker: string;
  title: [lead: string, accent: string];
  checklist?: { title: string; items: string[] };
  footnote: string;
  children: ReactNode;
};

export function EmailLayout({ preview, siteUrl, hero, headerLink, kicker: label, title, checklist, footnote, children }: LayoutProps) {
  const asset = (file: string) => `${publicOrigin}/email/${file}`;
  return (
    <Html lang="tr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </Head>
      {/* Body copies its style onto an inner <td>, hence the ".page > table …" dark rule. */}
      <Body className="page" lang="tr" style={{ margin: 0, padding: 0, backgroundColor: colors.page, fontFamily: sans, color: colors.ink }}>
        <Preview>{preview}</Preview>
        <Container tdClassName="shell" style={{ width: "100%", maxWidth: 600, margin: "0 auto", padding: "32px 16px 48px" }}>
          <Section style={{ padding: "0 6px 18px" }}>
            <Row>
              <Column style={{ verticalAlign: "middle" }}>
                <Link href={siteUrl} style={{ textDecoration: "none" }}>
                  <Img src={asset("avatar.png")} width={40} height={40} alt="" style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 999 }} />
                  <span className="ink" style={{ verticalAlign: "middle", marginLeft: 10, fontFamily: sans, fontSize: 18, fontWeight: 600, color: colors.ink }}>Nilgün Oygur</span>
                </Link>
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Link href={headerLink.href} style={{ display: "inline-block", backgroundColor: colors.forest, color: "#ffffff", borderRadius: 999, padding: "8px 16px", fontFamily: sans, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  {headerLink.label}&nbsp;↗
                </Link>
              </Column>
            </Row>
          </Section>

          <Section className="card" style={{ backgroundColor: colors.card, borderRadius: 28, border: `1px solid ${colors.rule}`, overflow: "hidden" }}>
            <Img className="hero" src={asset(hero.file)} alt={hero.alt} width={600} height={300} style={{ display: "block", width: "100%", maxWidth: 600, height: "auto", border: 0 }} />
            <Section tdClassName="content" style={{ padding: "40px 44px 44px" }}>
              <Text className="ink" style={{ ...kicker, margin: "0 0 18px" }}>
                <Img src={asset("leaf.png")} width={16} height={16} alt="" style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 8 }} />
                {label}
              </Text>
              <Heading as="h1" className="title ink" style={{ margin: "0 0 18px", fontFamily: serif, fontSize: 38, lineHeight: "44px", fontWeight: 400, letterSpacing: "-0.8px", color: colors.ink }}>
                {title[0]}<br /><span className="accent" style={{ color: colors.teal }}>{title[1]}</span>
              </Heading>
              {children}
            </Section>
          </Section>

          {checklist && (
            <Section className="panel" tdClassName="aside" style={{ marginTop: 16, backgroundColor: colors.panel, borderRadius: 28, padding: "28px 44px" }}>
              <Text className="ink" style={{ ...kicker, margin: "0 0 16px" }}>{checklist.title}</Text>
              {checklist.items.map(item => (
                <Row key={item} style={{ marginBottom: 10 }}>
                  <Column style={{ width: 34, verticalAlign: "top" }}>
                    <Img src={asset("check.png")} width={22} height={22} alt="" style={{ display: "block", marginTop: 1 }} />
                  </Column>
                  <Column style={{ verticalAlign: "top" }}>
                    <Text className="ink" style={{ ...text, fontSize: 15, lineHeight: "24px", margin: 0 }}>{item}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Section style={{ padding: "36px 12px 0", textAlign: "center" }}>
            <LinkRow links={nav.map(({ label, href }) => ({ label, href: `${siteUrl}${href}` }))} className="muted" color={colors.muted} />
            <LinkRow links={socials} className="accent" color={colors.teal} bold />
            <Small style={{ fontSize: 12, lineHeight: "18px", margin: "8px auto 6px", maxWidth: 420 }}>{footnote}</Small>
            <Small style={{ fontSize: 12, margin: 0 }}>Nilgün Oygur © {new Date().getFullYear()}</Small>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function LinkRow({ links, className, color, bold }: { links: { label: string; href: string }[]; className: string; color: string; bold?: boolean }) {
  return (
    <Small style={{ margin: "0 0 14px" }}>
      {links.map(({ label, href }, index) => (
        <span key={href}>
          {index > 0 && <>&nbsp;&nbsp;·&nbsp;&nbsp;</>}
          <Link className={className} href={href} style={{ color, fontWeight: bold ? 600 : undefined, textDecoration: "none" }}>{label}</Link>
        </span>
      ))}
    </Small>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text className="ink" style={text}>{children}</Text>;
}

export function Small({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text className="muted" style={{ ...small, ...style }}>{children}</Text>;
}

export function ActionButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ width: "100%", margin: "30px 0 22px" }}>
      <Button className="button" href={href} style={{ display: "inline-block", backgroundColor: colors.forest, color: "#ffffff", fontFamily: sans, fontSize: 16, fontWeight: 600, lineHeight: "24px", textDecoration: "none", borderRadius: 999, padding: "15px 30px" }}>
        {children}&nbsp;&nbsp;→
      </Button>
    </Section>
  );
}

export function LinkFallback({ url }: { url: string }) {
  return (
    <>
      <Hr className="rule" style={{ borderColor: colors.rule, margin: "26px 0 20px" }} />
      <Small style={{ margin: "0 0 6px" }}>Düğme çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:</Small>
      <Small style={{ margin: 0, wordBreak: "break-all" }}>
        <Link className="link" href={url} style={{ color: colors.forest, textDecoration: "underline" }}>{url}</Link>
      </Small>
    </>
  );
}
