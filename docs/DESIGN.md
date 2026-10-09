# DESIGN — Tender Package Builder

## Macrostructure
Single-screen workspace: top bar → tender summary strip → two-pane body (requirements | file tray) → sticky status + generate bar. No hero, no card grid.

## Palette
Paper/manila folder feel. 60% warm off-white surfaces, 30% graphite text + dark header, 10% muted status hues (green OK, amber, red). Accent (#4a5ab5) reserved for: Generate button, active toggle, focus ring, OK status.

## Typography
- Body: Inter
- Display: system serif (Charter/Georgia)
- Bangla: Noto Sans Bengali, line-height 1.75, no letter-spacing/all-caps
- 4 sizes (0.75/0.875/1/1.25rem), max 2 weights (400/600)

## Components
- Top bar: dark, logo left, lang toggle right
- Requirement row: order + title + badges | status | match select + expiry input
- Status badge: color-coded pill
- Dropzone: dashed border, drag-over highlight
- File item: name + page count + duplicate badge + match info + remove
- Generate bar: sticky bottom, blocking reasons + button

## Motion
State communication only: 180ms ease-out crossfades. Respect prefers-reduced-motion.

## Banned
Gradient hero, emoji icons, generic AI copy, accent used everywhere.
