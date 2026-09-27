"use client";

import { Suspense, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConsentBanner, ConsentDialog, ConsentDialogLink, ConsentManagerProvider, useConsentManager, type Translations } from "@c15t/nextjs";
import { sendPageView, setAnalyticsConsent, startAnalytics } from "@/lib/analytics";

// Offline mode (consent stored in the browser); c15t has no TR jurisdiction, so one opt-in policy covers everyone.

type Script = NonNullable<ComponentProps<typeof ConsentManagerProvider>["options"]["scripts"]>[number];

const tr: Partial<Translations> = {
  common: { acceptAll: "Kabul et", rejectAll: "Reddet", customize: "Tercihler", save: "Tercihleri kaydet", close: "Kapat", securedBy: "Güvence:" },
  cookieBanner: {
    title: "Gizliliğinize önem veriyoruz",
    description: "Sitemizi nasıl kullandığınızı anlamak ve içerikleri geliştirmek için Google Analytics çerezlerini kullanmak istiyoruz. Onay vermezseniz analiz çerezi kaydedilmez; tercihinizi dilediğiniz zaman alt bilgideki “Çerez tercihleri” bağlantısından değiştirebilirsiniz.",
  },
  consentManagerDialog: { title: "Çerez tercihleri", description: "Hangi çerezlere izin verdiğinizi buradan seçebilirsiniz. Zorunlu çerezler sitenin çalışması için gereklidir ve kapatılamaz." },
  consentTypes: {
    necessary: { title: "Zorunlu", description: "Oturum açma ve güvenlik gibi sitenin çalışması için gerekli çerezler. Kapatılamaz." },
    measurement: { title: "Analiz", description: "Google Analytics ile hangi sayfaların ve yazıların okunduğunu anonim olarak ölçmemize yardımcı olur." },
  },
};

function googleAnalytics(id: string): Script {
  return {
    id: "google-analytics",
    src: `https://www.googletagmanager.com/gtag/js?id=${id}`,
    category: "measurement",
    async: true,
    // gtag stays loaded; revocation goes through Consent Mode.
    persistAfterConsentRevoked: true,
    onBeforeLoad: () => startAnalytics(id),
    onConsentChange: ({ hasConsent }) => setAnalyticsConsent(hasConsent),
  };
}

export function ConsentManager({ analyticsId, children }: { analyticsId: string; children: ReactNode }) {
  return <ConsentManagerProvider options={{
    mode: "offline",
    consentCategories: ["necessary", "measurement"],
    offlinePolicy: {
      policyPacks: [{
        id: "everyone_opt_in",
        match: { isDefault: true },
        consent: { model: "opt-in", expiryDays: 365, categories: ["necessary", "measurement"] },
        ui: { mode: "banner" },
        proof: { storeIp: false, storeUserAgent: false, storeLanguage: false },
      }],
    },
    i18n: { locale: "tr", detectBrowserLanguage: false, messages: { tr } },
    scripts: [googleAnalytics(analyticsId)],
    // Revocation reloads the page; deny first so gtag doesn't rewrite its cookies while unloading.
    callbacks: { onBeforeConsentRevocationReload: ({ preferences }) => { if (!preferences.measurement) setAnalyticsConsent(false); } },
    colorScheme: "light",
    theme: {
      colors: {
        primary: "#224c40", primaryHover: "#326551", surface: "#ffffff", surfaceHover: "#f1f5e9", border: "rgba(34,76,64,0.12)", borderHover: "rgba(34,76,64,0.24)",
        text: "#30302e", textMuted: "#64645f", textOnPrimary: "#ffffff", switchTrack: "#dfe6d6", switchTrackActive: "#224c40", switchThumb: "#ffffff",
      },
      typography: { fontFamily: "var(--font-general), sans-serif" },
      radius: { sm: "10px", md: "16px", lg: "24px", full: "9999px" },
      shadows: { lg: "0 18px 50px -20px rgba(34,76,64,0.45)" },
      consentActions: { accept: { variant: "primary", mode: "filled" }, reject: { variant: "neutral", mode: "stroke" }, customize: { variant: "neutral", mode: "ghost" } },
    },
  }}>
    <ConsentBanner hideBranding />
    <ConsentDialog hideBranding />
    {/* usePathname() blocks prerendering of dynamic routes unless it sits under Suspense. */}
    <Suspense fallback={null}><PageViews /></Suspense>
    {children}
  </ConsentManagerProvider>;
}

/** One page_view per route once measurement is allowed; waits up to 1.5 s for the streamed title. */
function PageViews() {
  const pathname = usePathname();
  const allowed = useConsentManager().has("measurement");
  const lastTitle = useRef("");
  useEffect(() => {
    if (!allowed) return;
    let timer: ReturnType<typeof setTimeout>, tries = 0;
    const waitForTitle = () => {
      if ((document.title && document.title !== lastTitle.current) || ++tries >= 15) { sendPageView(pathname); lastTitle.current = document.title; }
      else timer = setTimeout(waitForTitle, 100);
    };
    timer = setTimeout(waitForTitle, 100);
    return () => clearTimeout(timer);
  }, [pathname, allowed]);
  return null;
}

export function ConsentSettingsLink({ className }: { className?: string }) {
  return <ConsentDialogLink className={className}>Çerez tercihleri</ConsentDialogLink>;
}
