// Main entry point - Tender Package Builder
import { initI18n } from './i18n.js';

// Initialize i18n on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  console.log('[Tender Package Builder] i18n initialized, lang:', document.documentElement.lang);
});

// Listen for language changes to re-render dynamic content
document.addEventListener('languagechange', (e) => {
  console.log('[Tender Package Builder] Language changed to:', e.detail.lang);
  // Dynamic content re-rendering will be added in later milestones
});