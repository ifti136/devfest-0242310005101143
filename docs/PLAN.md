# PLAN — Tender Package Builder

## Milestones
| # | Scope | Status |
|---|-------|--------|
| M0 | Scaffold + language toggle | Done |
| M1 | Tender summary + requirements (EN/BN) | Done |
| M2a | Upload + SHA-256 duplicates + statuses | Done |
| M2b | PDF generation (cover + footers) | Done |
| M3 | Polish + accessibility | Done |
| M4 | Audit + deploy | Pending |

## Time budget: 1 hour

## Scope-cut order (if behind)
1. Bangla on PDF cover
2. CSV export, save/reopen, auto-match
3. PNG seal/signature, index page
4. Complex animations

## [VERIFY] items
- pdf-lib/pdf.js CDN load in browser
- SHA-256 via crypto.subtle in browser
- Footer placement doesn't cover content
