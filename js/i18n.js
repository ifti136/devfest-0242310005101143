let currentLang = 'en';
let locales = { en: {}, bn: {} };
let initialized = false;

/**
 * Resolve initial language per spec:
 * 1) localStorage 'lang'
 * 2) ?lang= URL param
 * 3) navigator.language starts with 'bn'
 * 4) 'en' (default)
 */
function resolveInitialLang() {
  const saved = localStorage.getItem('lang');
  if (saved === 'bn' || saved === 'en') return saved;

  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang === 'bn' || urlLang === 'en') return urlLang;

  if (navigator.language?.toLowerCase().startsWith('bn')) return 'bn';

  return 'en';
}

/**
 * Deep get value from nested object using dot notation key
 */
function getNested(obj, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

/**
 * Load locale modules dynamically
 */
async function loadLocales() {
  const [enMod, bnMod] = await Promise.all([
    import('./locales/en.js'),
    import('./locales/bn.js')
  ]);
  locales.en = enMod.default || enMod;
  locales.bn = bnMod.default || bnMod;
}

/**
 * Apply language to document: html[lang], title, meta description, toggle buttons
 */
function applyLang(lang) {
  document.documentElement.lang = lang;

  // Update document.title from locale
  const titleKey = 'meta.title';
  const title = t(titleKey);
  if (title !== titleKey) document.title = title;

  // Update meta description
  const descKey = 'meta.description';
  const desc = t(descKey);
  if (desc !== descKey) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;
  }

  // Update toggle button aria-pressed
  document.querySelectorAll('.lang-toggle__btn').forEach(btn => {
    const isActive = btn.dataset.lang === lang;
    btn.setAttribute('aria-pressed', isActive.toString());
  });
}

/**
 * Translate key with interpolation support.
 * Missing key in active language -> fall back to en; missing in both -> return key and console.warn
 */
function t(key, params) {
  const langDict = locales[currentLang] || {};
  const fallbackDict = locales.en || {};

  let value = getNested(langDict, key);
  if (value === undefined) {
    value = getNested(fallbackDict, key);
    if (value === undefined) {
      console.warn(`[i18n] Missing translation key: "${key}" in both ${currentLang} and en`);
      return key;
    }
  }

  if (params && typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
  }

  return value;
}

/**
 * Initialize i18n: load locales, resolve language, apply, wire toggle
 */
export async function initI18n() {
  if (initialized) return;
  await loadLocales();

  currentLang = resolveInitialLang();
  applyLang(currentLang);

  // Wire language toggle buttons
  document.querySelectorAll('.lang-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Apply translations to static elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translated = t(key);
    if (translated !== key) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    }
  });

  // Apply translations to attributes with data-i18n-attr
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrSpec = el.dataset.i18nAttr;
    attrSpec.split(';').forEach(pair => {
      const [attr, key] = pair.split(':');
      if (attr && key) {
        const translated = t(key.trim());
        if (translated !== key.trim()) {
          el.setAttribute(attr.trim(), translated);
        }
      }
    });
  });

  initialized = true;
}

/**
 * Get current language
 */
export function getLang() {
  return currentLang;
}

/**
 * Set language, persist, apply, fire languagechange event
 */
export function setLang(lang) {
  if (lang !== 'en' && lang !== 'bn') return;
  if (lang === currentLang) return;

  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyLang(lang);

  // Re-translate static elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translated = t(key);
    if (translated !== key) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrSpec = el.dataset.i18nAttr;
    attrSpec.split(';').forEach(pair => {
      const [attr, key] = pair.split(':');
      if (attr && key) {
        const translated = t(key.trim());
        if (translated !== key.trim()) {
          el.setAttribute(attr.trim(), translated);
        }
      }
    });
  });

  // Fire languagechange event
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

/**
 * Format number using Intl with active locale (bn-BD or en-US)
 */
export function fmtNumber(n) {
  return new Intl.NumberFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US').format(n);
}

/**
 * Format currency as BDT (৳) using Intl
 */
export function fmtCurrency(n) {
  return new Intl.NumberFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US', {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'symbol'
  }).format(n);
}

/**
 * Format date using Intl with active locale
 */
export function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}