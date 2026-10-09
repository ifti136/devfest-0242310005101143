/**
 * Theme engine — Tender Package Builder
 * Light "Paper" (default) / Dark "Teal" switchable via header toggle.
 * Persists to localStorage key `theme`. Fires `themechange` event.
 */

import { t } from './i18n.js';

const THEME_STORAGE_KEY = 'theme';
const THEME_ATTR = 'data-theme';

/** Apply theme to <html> and persist. */
export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute(THEME_ATTR, 'dark');
  } else {
    html.removeAttribute(THEME_ATTR);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch { /* private mode */ }
  document.dispatchEvent(new CustomEvent('themechange', {
    detail: { theme }, bubbles: true,
  }));
}

/** Get current theme ('light' | 'dark'). */
export function getTheme() {
  return document.documentElement.hasAttribute(THEME_ATTR) ? 'dark' : 'light';
}

/** Toggle theme and return new theme. */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Initialize theme from localStorage (default light). Must run before paint. */
export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* ignore */ }
  const initial = (saved === 'dark' || saved === 'light') ? saved : 'light';
  applyTheme(initial);
  return initial;
}

/** Wire the theme toggle button (44x44 icon button). */
export function wireThemeToggle() {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;

  function updateButton() {
    const theme = getTheme();
    btn.setAttribute('aria-pressed', theme === 'dark');
    btn.setAttribute('aria-label', theme === 'dark'
      ? t('theme.switch_light') : t('theme.switch_dark'));
    // Glyph swap handled by CSS via [aria-pressed] on the button
  }

  updateButton();
  btn.addEventListener('click', () => {
    toggleTheme();
    updateButton();
  });

  // Keep in sync if theme changes from elsewhere (e.g., storage event)
  document.addEventListener('themechange', updateButton);
  document.addEventListener('languagechange', updateButton);
}