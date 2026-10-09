# PRD — Tender Package Builder

**Source:** project.md (approved as PRD)

## Problem
Office staff assembling tender submissions manually match PDFs to requirements, check expiry dates, and page-number documents. Errors cause disqualification.

## Core feature
Frontend-only tool: load requirements, upload PDFs, match files, detect duplicates (SHA-256), check statuses, generate page-numbered PDF package.

## Statuses (blocking = prevents generate)
- **Missing** (mandatory, no file) — blocks
- **Expiry date needed** (has_expiry, matched, no date) — blocks
- **Expired** (expiry < deadline) — blocks
- **Not provided** (optional, no file) — no block
- **OK** (matched, expiry ≥ deadline or no expiry) — no block

## Constraints
- No backend, no API keys. All PDF processing in-browser.
- Libraries: pdf-lib (merge/footers), pdf.js (page count). Google Fonts allowed.
- Bilingual EN/BN with top-bar toggle, persists across visits.
- Mobile-first, 360px minimum.

## Success criteria
- Full flow works in both languages
- i18n check passes (0 missing keys)
- No console errors
- PDF generates with cover + footers on all pages
