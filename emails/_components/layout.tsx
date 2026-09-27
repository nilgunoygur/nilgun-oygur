import type { CSSProperties, ReactNode } from "react";
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "react-email";

// Light values mirror app/globals.css. Dark values are applied by clients that honour
// prefers-color-scheme (Apple Mail, iOS, Outlook.com); Gmail and Outlook apps invert on their own,
// so every light colour is also chosen to survive automatic inversion.
export const colors = {
  page: "#f5f5f7",
  card: "#ffffff",
  panel: "#dfeee5",
  ink: "#30302e",
  muted: "#6b6b68",
  teal: "#4b999c",
  forest: "#224c40",
  rule: "#e7e7e7",
};
const dark = { page: "#0f1311", card: "#1a1f1c", panel: "#1f2c26", ink: "#eef0ec", muted: "#a7aea9", teal: "#7cc4c6", rule: "#2b332e" };

const sans = "'General Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const serif = "Recoleta, Georgia, 'Times New Roman', serif";

export const text: CSSProperties = { margin: "0 0 16px", fontFamily: sans, fontSize: 16, lineHeight: "26px", color: colors.ink };
export const small: CSSProperties = { ...text, fontSize: 13, lineHeight: "20px", color: colors.muted };
export const kicker: CSSProperties = { margin: 0, fontFamily: sans, fontSize: 11, lineHeight: "18px", fontWeight: 600, letterSpacing: "1.8px", color: colors.ink };

const styles = (siteUrl: string) => `
@font-face { font-family: Recoleta; font-weight: 400; src: url(${siteUrl}/fonts/recoleta.ttf) format("truetype"); }
@font-face { font-family: "General Sans"; font-weight: 400; src: url(${siteUrl}/fonts/general-400.woff2) format("woff2"); }
@font-face { font-family: "General Sans"; font-weight: 600; src: url(${siteUrl}/fonts/general-600.woff2) format("woff2"); }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .page, .page > table > tbody > tr > td { background-color: ${dark.page} !important; }
  .card { background-color: ${dark.card} !important; border-color: ${dark.rule} !important; }
  .panel { background-color: ${dark.panel} !important; }
  .ink { color: ${dark.ink} !important; }
  .muted { color: ${dark.muted} !important; }
  .accent, .link { color: ${dark.teal} !important; }
  .button { background-color: ${dark.teal} !important; color: ${dark.page} !important; }
  .rule { border-color: ${dark.rule} !important; }
}
[data-ogsc] .ink { color: ${dark.ink} !important; }
[data-ogsc] .muted { color: ${dark.muted} !important; }
[data-ogsc] .accent, [data-ogsc] .link { color: ${dark.teal} !important; }
@media only screen and (max-width: 600px) {
  .shell > tbody > tr > td { padding: 16px 10px 32px !important; }
  .content > tbody > tr > td { padding: 30px 22px 32px !important; }
  .aside > tbody > tr > td { padding: 24px 22px !important; }
  .title { font-size: 31px !important; line-height: 38px !important; }
  .hero { width: 100% !important; height: auto !important; }
  .button { display: block !important; text-align: center !important; }
}`;

type LayoutProps = {
  preview: string;
  siteUrl: string;
  hero: { src: string; alt: string };
  /** The pill in the header, e.g. Akademi. */
  headerLink: { label: string; href: string };
  footnote: string;
  children: ReactNode;
  /** Optional mint panel under the card. */
  aside?: ReactNode;
};

export const asset = (siteUrl: string, file: string) => `${siteUrl}/email/${file}`;

// react-email 6 puts Section/Container padding on the inner <td>, hence the "> tbody > tr > td" selectors.
/** Shared frame for every site email, modelled on the Akademi sign-in page. */
export function EmailLayout({ preview, siteUrl, hero, headerLink, footnote, children, aside }: LayoutProps) {
  return (
    <Html lang="tr" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: styles(siteUrl) }} />
      </Head>
      <Body className="page" lang="tr" style={{ margin: 0, padding: 0, backgroundColor: colors.page, fontFamily: sans, color: colors.ink }}>
        <Preview>{preview}</Preview>
        <Container className="shell" style={{ width: "100%", maxWidth: 600, margin: "0 auto", padding: "32px 16px 48px" }}>
          <Section style={{ padding: "0 6px 18px" }}>
            <Row>
              <Column style={{ verticalAlign: "middle" }}>
                <Link href={siteUrl} style={{ textDecoration: "none" }}>
                  <Img src={asset(siteUrl, "avatar.png")} width={40} height={40} alt="" style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 999 }} />
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
            <Img className="hero" src={hero.src} alt={hero.alt} width={600} height={300} style={{ display: "block", width: "100%", maxWidth: 600, height: "auto", border: 0 }} />
            <Section className="content" style={{ padding: "40px 44px 44px" }}>
              {children}
            </Section>
          </Section>

          {aside && (
            <Section className="panel aside" style={{ marginTop: 16, backgroundColor: colors.panel, borderRadius: 28, padding: "28px 44px" }}>
              {aside}
            </Section>
          )}

          <Footer siteUrl={siteUrl} footnote={footnote} />
        </Container>
      </Body>
    </Html>
  );
}

const footerLinks = [
  ["Kitaplarım", "/kitaplarim"], ["Eğitimlerim", "/egitimlerim"], ["Yazılarım", "/blog"], ["İletişim", "/iletisim"], ["Akademi", "/akademi"],
] as const;
const socials = [
  ["Instagram", "https://www.instagram.com/nilgun_oygur/"], ["YouTube", "https://www.youtube.com/@nilgunoygur4942"], ["TikTok", "https://www.tiktok.com/@nilgun_oygur"],
] as const;

function Footer({ siteUrl, footnote }: { siteUrl: string; footnote: string }) {
  const link: CSSProperties = { ...small, fontSize: 13, color: colors.muted, textDecoration: "none" };
  return (
    <Section style={{ padding: "36px 12px 0", textAlign: "center" }}>
      <Text style={{ ...small, margin: "0 0 14px" }}>
        {footerLinks.map(([label, path], index) => (
          <span key={path}>{index > 0 && <span className="muted" style={{ color: colors.rule }}>&nbsp;&nbsp;·&nbsp;&nbsp;</span>}<Link className="muted" href={`${siteUrl}${path}`} style={link}>{label}</Link></span>
        ))}
      </Text>
      <Text style={{ ...small, margin: "0 0 22px" }}>
        {socials.map(([label, href], index) => (
          <span key={href}>{index > 0 && <span className="muted">&nbsp;&nbsp;·&nbsp;&nbsp;</span>}<Link className="link" href={href} style={{ ...link, color: colors.teal, fontWeight: 600 }}>{label}</Link></span>
        ))}
      </Text>
      <Text className="muted" style={{ ...small, fontSize: 12, lineHeight: "18px", margin: "0 auto 6px", maxWidth: 420 }}>{footnote}</Text>
      <Text className="muted" style={{ ...small, fontSize: 12, margin: 0 }}>Nilgün Oygur © {new Date().getFullYear()}</Text>
    </Section>
  );
}

export function Kicker({ siteUrl, children }: { siteUrl: string; children: ReactNode }) {
  return (
    <Text className="ink" style={{ ...kicker, margin: "0 0 18px" }}>
      <Img src={asset(siteUrl, "leaf.png")} width={16} height={16} alt="" style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 8 }} />
      {children}
    </Text>
  );
}

/** Two-tone serif headline, like the site's “Yolculuğunuz, kaldığınız yerden.” */
export function Title({ lead, accent }: { lead: string; accent: string }) {
  return (
    <Heading as="h1" className="title ink" style={{ margin: "0 0 18px", fontFamily: serif, fontSize: 38, lineHeight: "44px", fontWeight: 400, letterSpacing: "-0.8px", color: colors.ink }}>
      {lead}<br /><span className="accent" style={{ color: colors.teal }}>{accent}</span>
    </Heading>
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

/** Some clients strip buttons; the raw URL keeps the action usable. */
export function LinkFallback({ url }: { url: string }) {
  return (
    <>
      <Hr className="rule" style={{ borderColor: colors.rule, margin: "26px 0 20px" }} />
      <Small style={{ margin: "0 0 6px" }}>Düğme çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:</Small>
      <Text style={{ ...small, margin: 0, wordBreak: "break-all" }}>
        <Link className="link" href={url} style={{ color: colors.forest, textDecoration: "underline" }}>{url}</Link>
      </Text>
    </>
  );
}

/** Checklist rows for the mint panel, echoing the ✓ cards on the home page. */
export function Checklist({ siteUrl, title, items }: { siteUrl: string; title: string; items: string[] }) {
  return (
    <>
      <Text className="ink" style={{ ...kicker, margin: "0 0 16px" }}>{title}</Text>
      {items.map(item => (
        <Row key={item} style={{ marginBottom: 10 }}>
          <Column style={{ width: 34, verticalAlign: "top" }}>
            <Img src={asset(siteUrl, "check.png")} width={22} height={22} alt="" style={{ display: "block", marginTop: 1 }} />
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text className="ink" style={{ ...text, fontSize: 15, lineHeight: "24px", margin: 0 }}>{item}</Text>
          </Column>
        </Row>
      ))}
    </>
  );
}
