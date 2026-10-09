# I18N Spec

## Languages
- `en` (default fallback), `bn` (বাংলা)
- Resolution: localStorage `lang` → `?lang=` param → navigator.language → en

## Files
- `js/locales/en.js`, `js/locales/bn.js` — identical key sets
- `js/i18n.js` — only module that knows about languages

## API
- `initI18n()` — resolve language, apply, wire toggle
- `t(key, params?)` — translate with `{name}` interpolation, en fallback
- `getLang()` / `setLang(lang)`
- `applyStaticI18n()` — update `[data-i18n]` and `[data-i18n-attr]` elements
- `fmtNumber(n)`, `fmtCurrency(n)`, `fmtDate(d)` via Intl

## DOM contract
- Static: `data-i18n="key"` sets textContent; `data-i18n-attr="attr:key;attr2:key2"` sets attributes
- Dynamic: re-render on `languagechange` event
- Toggle: two `<button>` with `aria-pressed`, always visible

## Rules
1. Zero hardcoded user-visible strings outside locale files
2. Identical keys in both files (enforced by check-i18n.mjs)
3. Bangla natural, not literal (flag with `// REVIEW`)
4. Interpolation, never string concatenation

## Check
`node scripts/check-i18n.mjs` must exit 0 before every commit.
