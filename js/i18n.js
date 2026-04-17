const HERTI_SUPPORTED_LOCALES = ["zh-Hans", "en", "ja", "ko"];
const HERTI_LOCALE_STORAGE_KEY = "herti-locale";

let hertiCurrentLocale = "zh-Hans";
let hertiCurrentMessages = null;

function hertiNormalizeLocale(input) {
  if (!input) return null;
  const value = String(input).trim();
  if (!value) return null;
  if (HERTI_SUPPORTED_LOCALES.includes(value)) return value;
  const lower = value.toLowerCase();
  if (lower.startsWith("zh")) return "zh-Hans";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  return null;
}

function hertiGetLocaleFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return hertiNormalizeLocale(params.get("lang"));
}

function hertiDetectLocale() {
  const fromQuery = hertiGetLocaleFromQuery();
  if (fromQuery) return fromQuery;

  const fromStorage = hertiNormalizeLocale(localStorage.getItem(HERTI_LOCALE_STORAGE_KEY));
  if (fromStorage) return fromStorage;

  return hertiNormalizeLocale(navigator.language) || "zh-Hans";
}

async function hertiLoadLocaleMessages(localeCode) {
  const normalized = hertiNormalizeLocale(localeCode) || "zh-Hans";
  try {
    const resp = await fetch(`locales/${normalized}.json`);
    if (!resp.ok) throw new Error(`Failed locale ${normalized}`);
    return await resp.json();
  } catch (err) {
    if (normalized !== "zh-Hans") {
      const fallback = await fetch("locales/zh-Hans.json");
      if (!fallback.ok) throw err;
      return await fallback.json();
    }
    throw err;
  }
}

function hertiSetDomLanguage(localeCode) {
  const map = {
    "zh-Hans": "zh-CN",
    en: "en",
    ja: "ja",
    ko: "ko",
  };
  document.documentElement.lang = map[localeCode] || "zh-CN";
}

function hertiGetMessage(path, fallback = "") {
  if (!hertiCurrentMessages) return fallback;
  const keys = path.split(".");
  let cursor = hertiCurrentMessages;
  for (const key of keys) {
    if (cursor == null || !(key in cursor)) return fallback;
    cursor = cursor[key];
  }
  return cursor;
}

function hertiSetLocaleInUrl(localeCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", localeCode);
  history.replaceState({}, "", url.toString());
}

async function hertiSetLocale(localeCode, options = {}) {
  const normalized = hertiNormalizeLocale(localeCode) || "zh-Hans";
  const messages = await hertiLoadLocaleMessages(normalized);
  hertiCurrentLocale = normalized;
  hertiCurrentMessages = messages;
  hertiSetDomLanguage(normalized);
  localStorage.setItem(HERTI_LOCALE_STORAGE_KEY, normalized);
  if (options.updateUrl !== false) hertiSetLocaleInUrl(normalized);
  return { locale: hertiCurrentLocale, messages: hertiCurrentMessages };
}

window.HERTI_I18N = {
  SUPPORTED: HERTI_SUPPORTED_LOCALES,
  detectLocale: hertiDetectLocale,
  setLocale: hertiSetLocale,
  t: hertiGetMessage,
  getCurrentLocale: () => hertiCurrentLocale,
  getCurrentMessages: () => hertiCurrentMessages,
};
