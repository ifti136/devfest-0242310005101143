/**
 * Entry point — Tender Package Builder.
 */

import { initI18n, applyStaticI18n } from './i18n.js';
import { initApp } from './app.js';

function boot() {
  initI18n();         // resolves language, applies static i18n, wires toggle
  applyStaticI18n();  // ensure all data-i18n elements are translated
  // initApp fetches documents/requirements.json with embedded fallback,
  // then wires upload/generate and renders. Internal errors are caught there;
  // this catch is only a last resort so the page never dies silently.
  initApp().catch(e => console.error('App init failed:', e));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
