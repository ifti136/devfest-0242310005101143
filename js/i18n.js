/**
 * i18n Module — Tender Package Builder
 * Per spec from 04-i18n-spec.md
 * The only module that knows about languages.
 */

import en from './locales/en.js';
import bn from './locales/bn.js';

const LANG_STORAGE_KEY = 'lang';

let currentLang = 'en';
const locales = { en, bn };

/* ---- helpers ---- */

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

/** Resolve a dotted key like "nav.home" against a nested locale object. */
function lookup(lang, key) {
  const parts = key.split('.');
  let node = locales[lang];
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) =>
    params[k] !== undefined ? String(params[k]) : m
  );
}

/* ---- public API ---- */

/**
 * Translate a key with optional {param} interpolation.
 * Falls back to en if missing in active language; returns key + warn if missing in both.
 */
export function t(key, params) {
  let val = lookup(currentLang, key);
  if (val === undefined) val = lookup('en', key);
  if (val === undefined) {
    console.warn(`Missing i18n key: "${key}"`);
    return key;
  }
  return interpolate(val, params);
}

export function getLang() {
  return currentLang;
}

/**
 * Set language, apply to DOM, persist, fire languagechange.
 */
export function setLang(lang) {
  if (lang !== 'en' && lang !== 'bn') return false;
  currentLang = lang;

  const html = document.documentElement;
  html.setAttribute('lang', lang);

  // toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const isActive = btn.dataset.lang === lang;
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // persist
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* private mode */ }

  // document title + meta
  document.title = t('nav.topbar');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('nav.tagline'));

  // apply static i18n bindings
  applyStaticI18n();

  // notify dynamic listeners
  document.dispatchEvent(new CustomEvent('languagechange', {
    detail: { lang }, bubbles: true,
  }));

  return true;
}

/* ---- static DOM bindings ---- */

/**
 * Walk every element with data-i18n / data-i18n-attr and set text / attributes.
 * Safe to call repeatedly (on every language switch).
 */
export function applyStaticI18n() {
  // text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // attributes: data-i18n-attr="placeholder:key;aria-label:key2"
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const pairs = el.dataset.i18nAttr.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf(':');
      if (idx < 0) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

/* ---- Intl formatters ---- */

const localeFor = () => (currentLang === 'bn' ? 'bn-BD' : 'en-US');

export function fmtNumber(n) {
  return new Intl.NumberFormat(localeFor()).format(n);
}

export function fmtCurrency(n) {
  return new Intl.NumberFormat(localeFor(), {
    style: 'currency', currency: 'BDT',
  }).format(n);
}

export function fmtDate(d) {
  return new Intl.DateTimeFormat(localeFor(), {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(d));
}

/* ---- init ---- */

export function initI18n() {
  // 1. ?lang=bn|en  2. localStorage  3. navigator.language  4. en
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang === 'bn' || urlLang === 'en') {
    setLang(urlLang);
  } else {
    let saved = null;
    try { saved = localStorage.getItem(LANG_STORAGE_KEY); } catch { /* ignore */ }
    if (saved === 'bn' || saved === 'en') {
      setLang(saved);
    } else if (navigator.language && navigator.language.startsWith('bn')) {
      setLang('bn');
    } else {
      setLang('en');
    }
  }

  // wire toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // cross-tab sync
  try {
    addEventListener('storage', e => {
      if (e.key === LANG_STORAGE_KEY && (e.newValue === 'bn' || e.newValue === 'en')) {
        setLang(e.newValue);
      }
    });
  } catch { /* ignore */ }
}