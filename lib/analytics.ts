// GA4, loaded by c15t only after consent; the app sends cleaned page views itself.

const campaignParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "gclid", "gbraid", "wbraid"];

/** Origin, path and campaign params only, so tokens and return URLs never reach Google. */
export function analyticsLocation(href: string) {
  const url = new URL(href);
  const kept = new URLSearchParams();
  for (const key of campaignParams) {
    const value = url.searchParams.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

export const isTrackedPath = (pathname: string) => pathname !== "/yonetim" && !pathname.startsWith("/yonetim/");

export function contentGroup(pathname: string) {
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return "Blog";
  if (pathname === "/akademi" || pathname.startsWith("/akademi/") || pathname.startsWith("/egitimlerim")) return "Akademi";
  if (pathname.startsWith("/kitaplarim")) return "Kitaplar";
  return "Site";
}

/** GA4 ecommerce fields for one course. */
export function courseEcommerce(course: { slug: string; title: string; priceKurus: number }) {
  const price = course.priceKurus / 100;
  return { currency: "TRY", value: price, items: [{ item_id: course.slug, item_name: course.title, price, quantity: 1 }] };
}

type AnalyticsWindow = { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [disable: `ga-disable-${string}`]: boolean };
const analyticsWindow = () => window as unknown as AnalyticsWindow;

function gtag(...args: unknown[]) {
  const target = analyticsWindow();
  target.dataLayer ??= [];
  // gtag.js reads `arguments`, so this must stay a plain function.
  // eslint-disable-next-line prefer-rest-params
  target.gtag ??= function () { target.dataLayer!.push(arguments); };
  target.gtag(...args);
}

const state = { id: null as string | null, consent: false, pathname: "", pending: false, lastLocation: undefined as string | undefined };

function syncDisabled() {
  if (state.id) analyticsWindow()[`ga-disable-${state.id}`] = !state.consent || !isTrackedPath(state.pathname);
}

export function startAnalytics(id: string) {
  if (state.id) return;
  state.id = id;
  state.consent = true;
  gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  gtag("js", new Date());
  gtag("set", { page_location: analyticsLocation(location.href), page_referrer: cleanReferrer() });
  gtag("config", id, { send_page_view: false });
  if (state.pending) sendPageView(state.pathname);
}

export function setAnalyticsConsent(granted: boolean) {
  if (!state.id) return;
  state.consent = granted;
  gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
  syncDisabled();
  if (!granted) removeAnalyticsCookies();
}

/** One page_view per cleaned address; one sent before GA starts is sent by startAnalytics. */
export function sendPageView(pathname: string) {
  state.pathname = pathname;
  state.pending = !state.id;
  syncDisabled();
  if (!state.id || !state.consent || !isTrackedPath(pathname)) return;
  const pageLocation = analyticsLocation(location.href);
  if (pageLocation === state.lastLocation) return;
  gtag("set", { page_location: pageLocation, content_group: contentGroup(pathname) });
  gtag("event", "page_view", { page_location: pageLocation, page_title: document.title, ...(state.lastLocation ? { page_referrer: state.lastLocation } : {}) });
  state.lastLocation = pageLocation;
}

/** No-op until consent. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (state.id && state.consent) gtag("event", event, params);
}

function cleanReferrer() {
  if (!document.referrer) return undefined;
  try { return new URL(document.referrer).origin === location.origin ? analyticsLocation(document.referrer) : document.referrer; } catch { return undefined; }
}

/** Clears _ga cookies on this host and its parent domain. */
function removeAnalyticsCookies() {
  const names = document.cookie.split(";").map(cookie => cookie.split("=")[0].trim()).filter(name => name === "_ga" || name.startsWith("_ga_"));
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of names) for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
}
