# DESIGN — Tender Package Builder

> Amended 2026-10-09 (approved by user) to upgrade from the original flat paper-only
> direction to a dual-theme "modern government portal" workspace. Prior bans on a
> header band and on any gradient surface are lifted, narrowly. Everything else stands.

## Macrostructure
Single-screen workspace, top to bottom:
1. **Branded header band** — emblem (inline SVG), app name + tagline, local-processing
   indicator, theme switch, language switch. This is a compact identity band, NOT a
   marketing landing hero: no fake CTAs, no feature grid.
2. **Tender summary strip** — official "letterhead" block (tender ID anchored in display serif).
3. **Progress meter** — package completeness (ready / total) driven by existing status data.
4. **Two-pane body** — requirements checklist | uploaded file tray.
5. **Sticky status + generate bar** — blocking reasons + Generate.

## Theming (NEW)
- Two user-switchable themes via a header toggle: **Light "Paper"** (default) and
  **Dark "Teal"**. Switched by setting `data-theme="light|dark"` on `<html>`.
- **Always opens in Light "Paper" on first visit.** The user's explicit switch is
  persisted to `localStorage` (key `theme`) and restores it on later visits.
- ALL color comes from semantic CSS custom properties on `:root` /
  `html[data-theme="dark"]`. Components must never hardcode hex.
- Light = warm paper/manila (original). Dark = deep teal/charcoal, inspired by the
  approved reference: bg ~#071d1b, panels ~#0b2f2e, pale text ~#e5f2f4, teal accent.

## Palette
Light (paper): surfaces `#faf8f4` / `#f3ede2`, ink `#1e1e1e`, muted status hues,
accent `#4a5ab5`. 60/30/10 still applies.
Dark (teal): bg `#071d1b`, panel `#0b2f2e`, raised `#0f3a38`, border teal-tinted,
text `#e5f2f4`, muted `#8fb3bd`, accent teal. Status hues re-tuned for contrast.
Accent remains RESERVED for: primary Generate button, active toggle/switch state,
focus ring, OK status. Accent must not blanket the UI in either theme.

## Typography (unchanged)
- Body: Inter. Display: system serif (Charter/Georgia). Bangla: Noto Sans Bengali,
  line-height 1.75, no letter-spacing/all-caps.
- 4 sizes, max 2 weights (400/600).

## Components
- Header band: emblem, wordmark, tagline, processing indicator (dot + label),
  theme toggle, lang toggle.
- Progress meter: labeled bar + "N of M ready", semantic color by state.
- Requirement row: order marker + title + badges | status pill (inline SVG glyph) |
  match select + expiry input. 1px left state stripe.
- Status badge: color-coded pill with inline SVG glyph (no emoji).
- Dropzone: dashed border, drag-over highlight, inline SVG upload glyph.
- File item: PDF glyph + name + page count + duplicate badge + match info + remove.
- Empty states: subtle inline SVG + copy.
- Generate bar: sticky bottom, blocking reasons as annotated chips, Generate button.

## Motion
State communication only: 180ms ease-out crossfades (status chip, row match,
blocking list, theme switch). Respect prefers-reduced-motion. No bounce/scale hovers.

## Banned
- Emoji icons (inline SVG only)
- Generic AI copy ("elevate/unlock/seamless")
- Marketing landing hero with fake CTAs / feature grid
- Accent used everywhere (accent stays reserved, see Palette)
- Gradient on body or heading text. A subtle accent gradient is permitted ONLY on the
  header band surface and the logo emblem — never in the workspace content.
- Hardcoded colors outside the token files
