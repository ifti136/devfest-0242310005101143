/**
 * Core application logic — Tender Package Builder.
 * All state lives here. UI renders from state.
 */

import { tender as defaultTender, requirements as defaultRequirements } from './data/tender.js';
import { t, getLang } from './i18n.js';

/* ------------------------------------------------------------------ */
/* Mutable data (loaded from requirements.json if available)           */
/* ------------------------------------------------------------------ */

let tender = defaultTender;
let requirements = defaultRequirements;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const MAX_FILES = 30;
const MAX_TOTAL_MB = 50;

const state = {
  files: [],          // {id, name, hash, buffer, pageCount, matchedReqId}
  expiry: {},         // reqId -> 'YYYY-MM-DD'
  fileSeq: 0,
};

let isGenerating = false;

/* ------------------------------------------------------------------ */
/* Status calculation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Returns: 'missing' | 'expiry_needed' | 'expired' | 'not_provided' | 'ok'
 * Blocking: missing, expiry_needed, expired
 */
function statusFor(req) {
  const file = state.files.find(f => f.matchedReqId === req.id);
  if (!file) return req.mandatory ? 'missing' : 'not_provided';

  if (req.has_expiry) {
    const d = state.expiry[req.id];
    if (!d) return 'expiry_needed';
    // Same-day is OK: expired only if expiry < deadline (strict)
    if (d < tender.submission_deadline) return 'expired';
  }
  return 'ok';
}

const BLOCKING = new Set(['missing', 'expiry_needed', 'expired']);

function blockingCounts() {
  const c = { missing: 0, expiry_needed: 0, expired: 0 };
  for (const r of requirements) {
    const s = statusFor(r);
    if (BLOCKING.has(s)) c[s]++;
  }
  return c;
}

function hasBlocking() {
  for (const r of requirements) {
    if (BLOCKING.has(statusFor(r))) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* SHA-256 hashing                                                     */
/* ------------------------------------------------------------------ */

async function sha256(buffer) {
  // crypto.subtle requires secure context (HTTPS or localhost)
  if (crypto && crypto.subtle) {
    try {
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { /* fall through to fallback */ }
  }
  // Fallback: simple FNV-1a hash over sampled bytes (not cryptographic, but catches exact duplicates)
  const view = new Uint8Array(buffer);
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const step = Math.max(1, Math.floor(view.length / 4096));
  for (let i = 0; i < view.length; i += step) {
    h1 = ((h1 ^ view[i]) * 0x01000193) >>> 0;
    h2 = ((h2 + view[i] * (i + 1)) >>> 0);
  }
  return `fb_${h1.toString(16)}${h2.toString(16)}_${buffer.byteLength}`;
}

/** Hashes that appear more than once. */
function duplicateHashes() {
  const seen = new Map();
  for (const f of state.files) seen.set(f.hash, (seen.get(f.hash) || 0) + 1);
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([h]) => h));
}

/** Can this file be matched to reqId? (duplicate constraint) */
function canMatch(fileId, reqId) {
  const file = state.files.find(f => f.id === fileId);
  if (!file) return false;
  const conflict = state.files.find(
    f => f.hash === file.hash && f.id !== fileId &&
         f.matchedReqId && f.matchedReqId !== reqId
  );
  return !conflict;
}

/* ------------------------------------------------------------------ */
/* File upload                                                         */
/* ------------------------------------------------------------------ */

async function addFiles(fileList) {
  const errors = [];
  const pdfs = [];

  for (const f of fileList) {
    const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
    if (!isPdf) { errors.push(t('upload.rejected')); continue; }
    pdfs.push(f);
  }

  if (state.files.length + pdfs.length > MAX_FILES) {
    errors.push(t('upload.too_many', { max: MAX_FILES }));
    return errors;
  }

  const totalBytes =
    state.files.reduce((s, f) => s + f.buffer.byteLength, 0) +
    pdfs.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
    errors.push(t('upload.too_large', { max: MAX_TOTAL_MB }));
    return errors;
  }

  const newFiles = [];
  for (const pdf of pdfs) {
    const buffer = await pdf.arrayBuffer();
    const hash = await sha256(buffer);
    const fileObj = {
      id: `f${++state.fileSeq}`,
      name: pdf.name,
      hash,
      buffer,
      pageCount: 0, // filled async below
      matchedReqId: null,
    };
    state.files.push(fileObj);
    newFiles.push(fileObj);

    // Load page count asynchronously (non-blocking)
    getPageCount(buffer).then(n => {
      fileObj.pageCount = n;
      renderFileList(); // re-render just the file list
    });
  }

  // Try auto-match new files by filename
  autoMatch(newFiles);

  renderAll();
  return errors;
}

async function getPageCount(buffer) {
  try {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) return 0;
    const doc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise;
    const n = doc.numPages;
    doc.destroy();
    return n;
  } catch { return 0; }
}

function removeFile(fileId) {
  // Clean up expiry dates for requirements that lose their matched file
  const file = state.files.find(f => f.id === fileId);
  if (file && file.matchedReqId) {
    delete state.expiry[file.matchedReqId];
  }
  state.files = state.files.filter(f => f.id !== fileId);
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

function matchFile(reqId, fileId) {
  if (!fileId) { unmatch(reqId); return; }

  // one file per requirement — clear previous matches of this requirement
  for (const f of state.files) {
    if (f.matchedReqId === reqId) f.matchedReqId = null;
  }
  // one requirement per file — clear old assignment
  const file = state.files.find(f => f.id === fileId);
  if (file) file.matchedReqId = reqId;
  // NOTE: matching the same content (duplicate hash) to a different
  // requirement is allowed here — generation blocks with duplicate_match
  // so the user gets a clear, actionable reason instead of a silent filter.
}

function unmatch(reqId) {
  const f = state.files.find(x => x.matchedReqId === reqId);
  if (f) f.matchedReqId = null;
  delete state.expiry[reqId];
}

function setExpiry(reqId, dateStr) {
  if (dateStr) state.expiry[reqId] = dateStr;
  else delete state.expiry[reqId];
}

/* ------------------------------------------------------------------ */
/* Auto-match by filename                                              */
/* ------------------------------------------------------------------ */

function scoreMatch(fileName, req) {
  const name = fileName.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const title = req.title_en.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const titleWords = title.split(/\s+/).filter(w => w.length > 2);
  if (titleWords.length === 0) return 0;
  let matches = 0;
  for (const word of titleWords) {
    if (name.includes(word)) matches++;
  }
  return matches / titleWords.length;
}

function autoMatch(newFiles) {
  for (const req of requirements) {
    if (state.files.some(f => f.matchedReqId === req.id)) continue;
    let bestFile = null;
    let bestScore = 0;
    for (const f of newFiles) {
      if (f.matchedReqId) continue;
      if (!canMatch(f.id, req.id)) continue;
      const score = scoreMatch(f.name, req);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestFile = f;
      }
    }
    if (bestFile) bestFile.matchedReqId = req.id;
  }
}

/* ------------------------------------------------------------------ */
/* PDF generation                                                      */
/* ------------------------------------------------------------------ */

async function generatePDF() {
  if (isGenerating) return;
  if (!window.PDFLib) { alert(t('generate.error')); return; }

  isGenerating = true;
  const btn = $('#generate-btn');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
    const l = btn.querySelector('.btn-label'); if (l) l.textContent = t('generate.loading'); else btn.textContent = t('generate.loading');
  }

  try {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const warnings = [];

    /* --- cover page (always English per contest spec) --- */
    const W = 595, H = 842;
    const FOOTER_H = 30; // reserved bottom space for footer
    const cover = pdf.addPage([W, H]);
    let y = H - 60;

    const drawLine = (text, fnt, size) => {
      if (y < FOOTER_H + 10) return; // stop if running into footer area
      // Truncate long strings to fit page width
      let drawText = text;
      const maxWidth = W - 120;
      while (fnt.widthOfTextAtSize(drawText, size) > maxWidth && drawText.length > 3) {
        drawText = drawText.slice(0, -4) + '...';
      }
      cover.drawText(drawText, { x: 60, y, size, font: fnt, color: rgb(0.15, 0.15, 0.15) });
      y -= size + 8;
    };

    // Safe text: strip non-Latin1 chars that Helvetica can't render
    const safe = s => String(s).replace(/[^\x20-\x7E]/g, '?');

    drawLine(safe(tender.tender_id), bold, 22);
    drawLine(safe(tender.title), bold, 16);
    y -= 10;
    drawLine(`Procuring entity: ${safe(tender.procuring_entity)}`, font, 11);
    drawLine(`Bidder: ${safe(tender.bidder)}`, font, 11);
    drawLine(`Submission deadline: ${safe(tender.submission_deadline)}`, font, 11);
    drawLine(`Date generated: ${new Date().toISOString().slice(0, 10)}`, font, 11);
    y -= 20;
    drawLine('Included documents', bold, 13);

    const included = requirements
      .filter(r => state.files.some(f => f.matchedReqId === r.id))
      .sort((a, b) => a.order - b.order);

    for (const r of included) {
      drawLine(`  ${r.order}. ${safe(r.title_en)}`, font, 11);
    }

    /* --- merge matched document pages (sorted by order) --- */
    for (const r of included) {
      const file = state.files.find(f => f.matchedReqId === r.id);
      if (!file) continue;
      try {
        const src = await PDFDocument.load(file.buffer);
        const pages = await pdf.copyPages(src, src.getPageIndices());
        for (const p of pages) pdf.addPage(p);
      } catch (e) {
        console.warn(`Could not embed ${file.name}:`, e);
        warnings.push(t('generate.embed_error', { name: file.name }));
      }
    }

    /* --- footer on every page, placed in bottom margin --- */
    const allPages = pdf.getPages();
    const total = allPages.length;
    for (let i = 0; i < total; i++) {
      const pg = allPages[i];
      const { width, height } = pg.getSize();
      const label = `${tender.tender_id} | Page ${i + 1} of ${total}`;
      const fontSize = 8;
      const tw = font.widthOfTextAtSize(label, fontSize);
      // Place at y=15 — inside bottom margin of standard pages
      // For the cover page we created, there is plenty of room
      pg.drawText(label, {
        x: Math.max(10, (width - tw) / 2),
        y: 15,
        size: fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tender.tender_id}_Package.pdf`;
    a.click();
    // Delay revocation so the download can start reliably (esp. Safari)
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    // Show warnings for files that could not be embedded
    if (warnings.length > 0) {
      alert(warnings.join('\n'));
    }
  } finally {
    isGenerating = false;
    if (btn) {
      btn.classList.remove('loading');
      const l = btn.querySelector('.btn-label'); if (l) l.textContent = t('generate.button'); else btn.textContent = t('generate.button');
    }
    renderBlockingBar(); // restore correct disabled state
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const $ = sel => document.querySelector(sel);

/* ------------------------------------------------------------------ */
/* SVG icon helper                                                     */
/* ------------------------------------------------------------------ */

function svgIcon(name, size = 24) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `icon icon-${name}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const shapes = {
    ok: () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '7');
      const p = document.createElementNS(NS, 'polyline');
      p.setAttribute('points', '7 12 11 16 17 8');
      svg.append(c, p);
    },
    missing: () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '7');
      c.setAttribute('stroke-dasharray', '4 3');
      svg.append(c);
    },
    expiry: () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '7');
      const h1 = document.createElementNS(NS, 'line');
      h1.setAttribute('x1', '12'); h1.setAttribute('y1', '12'); h1.setAttribute('x2', '12'); h1.setAttribute('y2', '7');
      const h2 = document.createElementNS(NS, 'line');
      h2.setAttribute('x1', '12'); h2.setAttribute('y1', '12'); h2.setAttribute('x2', '15'); h2.setAttribute('y2', '12');
      svg.append(c, h1, h2);
    },
    expired: () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '7');
      const h1 = document.createElementNS(NS, 'line');
      h1.setAttribute('x1', '12'); h1.setAttribute('y1', '12'); h1.setAttribute('x2', '12'); h1.setAttribute('y2', '7');
      const h2 = document.createElementNS(NS, 'line');
      h2.setAttribute('x1', '12'); h2.setAttribute('y1', '12'); h2.setAttribute('x2', '15'); h2.setAttribute('y2', '12');
      const slash = document.createElementNS(NS, 'line');
      slash.setAttribute('x1', '5'); slash.setAttribute('y1', '5'); slash.setAttribute('x2', '19'); slash.setAttribute('y2', '19');
      svg.append(c, h1, h2, slash);
    },
    not_provided: () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '7');
      const m = document.createElementNS(NS, 'line');
      m.setAttribute('x1', '7'); m.setAttribute('y1', '12'); m.setAttribute('x2', '17'); m.setAttribute('y2', '12');
      svg.append(c, m);
    },
    warn: () => {
      const t = document.createElementNS(NS, 'path');
      t.setAttribute('d', 'M12 2L2 22h20Z');
      const ex = document.createElementNS(NS, 'line');
      ex.setAttribute('x1', '12'); ex.setAttribute('y1', '9'); ex.setAttribute('x2', '12'); ex.setAttribute('y2', '13');
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', '12'); dot.setAttribute('cy', '17'); dot.setAttribute('r', '1');
      svg.append(t, ex, dot);
    },
    check: () => {
      const p = document.createElementNS(NS, 'polyline');
      p.setAttribute('points', '5 12.5 9 16.5 19 7.5');
      svg.append(p);
    },
    dup: () => {
      const r1 = document.createElementNS(NS, 'rect');
      r1.setAttribute('x', '4'); r1.setAttribute('y', '4'); r1.setAttribute('width', '12'); r1.setAttribute('height', '12'); r1.setAttribute('rx', '2');
      const r2 = document.createElementNS(NS, 'rect');
      r2.setAttribute('x', '8'); r2.setAttribute('y', '8'); r2.setAttribute('width', '12'); r2.setAttribute('height', '12'); r2.setAttribute('rx', '2');
      svg.append(r1, r2);
    },
    remove: () => {
      const l1 = document.createElementNS(NS, 'line');
      l1.setAttribute('x1', '5'); l1.setAttribute('y1', '5'); l1.setAttribute('x2', '19'); l1.setAttribute('y2', '19');
      const l2 = document.createElementNS(NS, 'line');
      l2.setAttribute('x1', '19'); l2.setAttribute('y1', '5'); l2.setAttribute('x2', '5'); l2.setAttribute('y2', '19');
      svg.append(l1, l2);
    },
    pdf: () => {
      const page = document.createElementNS(NS, 'path');
      page.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z');
      const fold = document.createElementNS(NS, 'path');
      fold.setAttribute('d', 'M14 2v6h6');
      const l1 = document.createElementNS(NS, 'line');
      l1.setAttribute('x1', '8'); l1.setAttribute('y1', '12'); l1.setAttribute('x2', '16'); l1.setAttribute('y2', '12');
      const l2 = document.createElementNS(NS, 'line');
      l2.setAttribute('x1', '8'); l2.setAttribute('y1', '16'); l2.setAttribute('x2', '16'); l2.setAttribute('y2', '16');
      svg.append(page, fold, l1, l2);
    },
  };

  if (shapes[name]) shapes[name]();
  return svg;
}

/* ------------------------------------------------------------------ */
/* Progress meter                                                      */
/* ------------------------------------------------------------------ */

function renderProgressMeter() {
  const meter = $('.progress-meter');
  const fill = $('.meter-fill');
  const value = $('.meter-value');

  const ready = requirements.filter(r => statusFor(r) === 'ok').length;
  const total = requirements.length;

  if (fill) {
    fill.style.width = total ? (ready / total * 100) + '%' : '0%';
  }

  if (value) {
    const complete = total > 0 && ready === total;

    // Text element (preserves check icon)
    let textEl = value.querySelector('.meter-text');
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'meter-text';
      value.prepend(textEl);
    }
    textEl.textContent = complete
      ? t('progress.complete', { total })
      : t('progress.ready', { ready, total });

    // Check icon (create if missing, toggle visibility)
    let check = value.querySelector('.meter-check');
    if (!check) {
      check = svgIcon('check', 14);
      check.classList.add('meter-check');
      value.append(check);
    }
    if (complete) check.removeAttribute('hidden');
    else check.setAttribute('hidden', '');
  }

  if (meter) {
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', String(total));
    meter.setAttribute('aria-valuenow', String(ready));
    const complete = total > 0 && ready === total;
    const ariaText = complete
      ? t('progress.complete', { total })
      : t('progress.ready', { ready, total });
    meter.setAttribute('aria-valuetext', ariaText);
    meter.setAttribute('aria-label', t('a11y.progress', { ready, total }));
    meter.dataset.complete = complete ? 'true' : 'false';
    meter.dataset.ready = String(ready);
  }
}

function renderTenderSummary() {
  const el = $('#tender-summary');
  if (!el) return;
  el.replaceChildren();

  const rows = [
    ['tender.id', tender.tender_id],
    ['tender.title', tender.title],
    ['tender.entity', tender.procuring_entity],
    ['tender.bidder', tender.bidder],
    ['tender.deadline', tender.submission_deadline],
  ];
  for (const [key, val] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const label = document.createElement('span');
    label.className = 'summary-label';
    label.textContent = t(key);
    const value = document.createElement('span');
    value.className = 'summary-value';
    value.textContent = val;
    row.append(label, value);
    el.append(row);
  }
}

function renderRequirements() {
  const list = $('#requirements-list');
  if (!list) return;
  list.replaceChildren();

  const lang = getLang();
  const dupes = duplicateHashes();

  for (const req of requirements) {
    const row = document.createElement('div');
    row.className = 'requirement-row';
    row.dataset.reqId = req.id;

    const status = statusFor(req);
    row.dataset.status = status;

    /* left: order + title + badges */
    const left = document.createElement('div');
    left.className = 'req-left';

    const order = document.createElement('span');
    order.className = 'req-order';
    order.textContent = req.order;

    const title = document.createElement('span');
    title.className = 'req-title';
    title.textContent = lang === 'bn' ? req.title_bn : req.title_en;

    const badges = document.createElement('span');
    badges.className = 'req-badges';

    const mand = document.createElement('span');
    mand.className = 'req-badge ' + (req.mandatory ? 'mandatory' : 'optional');
    mand.textContent = req.mandatory ? t('requirements.required') : t('requirements.optional');
    badges.append(mand);

    if (req.has_expiry) {
      const exp = document.createElement('span');
      exp.className = 'req-badge expiry';
      exp.textContent = t('requirements.has_expiry');
      badges.append(exp);
    }

    left.append(order, title, badges);

    /* middle: status badge */
    const statusEl = document.createElement('span');
    statusEl.className = `status-badge status-${status}`;
    const glyphMap = { ok: 'ok', missing: 'missing', expiry_needed: 'expiry', expired: 'expired', not_provided: 'not_provided' };
    statusEl.appendChild(svgIcon(glyphMap[status], 14));
    statusEl.appendChild(document.createTextNode(t(`status.${status}`)));

    /* right: match select (+ expiry if needed) */
    const right = document.createElement('div');
    right.className = 'req-right';

    const select = document.createElement('select');
    select.className = 'match-select';
    select.setAttribute('aria-label', t('a11y.match_select', { name: title.textContent }));

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = t('upload.unmatched');
    select.append(noneOpt);

    const matchedFile = state.files.find(f => f.matchedReqId === req.id);

    for (const f of state.files) {
      // skip files already claimed by other requirements (one file → one req)
      if (f.matchedReqId && f.matchedReqId !== req.id) continue;

      const opt = document.createElement('option');
      opt.value = f.id;
      let label = f.name;
      if (dupes.has(f.hash)) label += ` (${t('upload.duplicate')})`;
      opt.textContent = label;
      if (matchedFile?.id === f.id) opt.selected = true;
      select.append(opt);
    }

    select.addEventListener('change', () => {
      matchFile(req.id, select.value);
      renderAll();
    });
    right.append(select);

    /* expiry date input (only for has_expiry + matched) */
    if (req.has_expiry && matchedFile) {
      const expInput = document.createElement('input');
      expInput.type = 'date';
      expInput.className = 'expiry-input';
      expInput.value = state.expiry[req.id] || '';
      expInput.setAttribute('aria-label', t('a11y.expiry_input', { name: title.textContent }));
      expInput.addEventListener('change', () => {
        setExpiry(req.id, expInput.value);
        renderAll();
      });
      right.append(expInput);
    }

    row.append(left, statusEl, right);
    list.append(row);
  }
}

function renderFileList() {
  const list = $('#file-list');
  if (!list) return;
  list.replaceChildren();

  const empty = $('#upload-empty');
  if (empty) empty.hidden = state.files.length > 0;

  const dz = $('#dropzone');
  if (dz) dz.classList.toggle('has-files', state.files.length > 0);

  const dupes = duplicateHashes();
  const lang = getLang();

  for (const f of state.files) {
    const item = document.createElement('div');
    item.className = 'file-item';

    const glyph = document.createElement('span');
    glyph.className = 'file-glyph';
    glyph.appendChild(svgIcon('pdf', 20));

    const info = document.createElement('div');
    info.className = 'file-info';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = f.name;
    info.append(name);

    if (f.pageCount > 0) {
      const pages = document.createElement('span');
      pages.className = 'file-pages';
      pages.textContent = t('upload.pages', { count: f.pageCount });
      info.append(pages);
    }

    if (dupes.has(f.hash)) {
      const dup = document.createElement('span');
      dup.className = 'file-dup-badge';
      dup.appendChild(svgIcon('dup', 12));
      dup.appendChild(document.createTextNode(t('upload.duplicate')));
      info.append(dup);
    }

    const matchedReq = f.matchedReqId
      ? requirements.find(r => r.id === f.matchedReqId)
      : null;
    const matchInfo = document.createElement('span');
    matchInfo.className = 'file-match-info';
    if (matchedReq) {
      matchInfo.textContent = t('upload.matched_to', {
        name: lang === 'bn' ? matchedReq.title_bn : matchedReq.title_en,
      });
      matchInfo.classList.add('matched');
    } else {
      matchInfo.textContent = t('upload.unmatched');
    }
    info.append(matchInfo);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', t('a11y.remove_file', { name: f.name }));
    removeBtn.appendChild(svgIcon('remove', 16));
    const sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = '\u00d7';
    removeBtn.appendChild(sr);
    removeBtn.addEventListener('click', () => { removeFile(f.id); renderAll(); });

    item.append(glyph, info, removeBtn);
    list.append(item);
  }
}

function renderBlockingBar() {
  const bar = $('#blocking-bar');
  const btn = $('#generate-btn');
  if (!bar || !btn) return;

  // Don't override button state while generating
  if (isGenerating) return;

  // app.js owns the button label (no data-i18n) — keep it in sync with locale
  const label = btn.querySelector('.btn-label');
  if (label) label.textContent = t('generate.button');
  else btn.textContent = t('generate.button');

  const counts = blockingCounts();

  // duplicate mismatch check
  let dupMismatch = false;
  const hashToReq = new Map();
  for (const f of state.files) {
    if (!f.matchedReqId) continue;
    if (hashToReq.has(f.hash) && hashToReq.get(f.hash) !== f.matchedReqId) {
      dupMismatch = true; break;
    }
    hashToReq.set(f.hash, f.matchedReqId);
  }

  const items = [];
  if (counts.missing)        items.push({ kind: 'missing',         label: t('blocking.missing', { count: counts.missing }) });
  if (counts.expiry_needed)  items.push({ kind: 'expiry_needed',   label: t('blocking.expiry_needed', { count: counts.expiry_needed }) });
  if (counts.expired)        items.push({ kind: 'expired',         label: t('blocking.expired', { count: counts.expired }) });
  if (dupMismatch)           items.push({ kind: 'duplicate_match', label: t('blocking.duplicate_match') });

  bar.replaceChildren();

  if (items.length === 0) {
    bar.hidden = true;
    btn.disabled = false;
    btn.removeAttribute('title');
    return;
  }

  bar.hidden = false;
  btn.disabled = true;
  btn.title = t('generate.disabled');

  const heading = document.createElement('strong');
  heading.appendChild(svgIcon('warn', 16));
  heading.appendChild(document.createTextNode(t('blocking.heading')));
  bar.append(heading);

  const ul = document.createElement('ul');
  const glyphMap = { missing: 'missing', expiry_needed: 'expiry', expired: 'expired', duplicate_match: 'dup' };
  for (const item of items) {
    const li = document.createElement('li');
    li.className = item.kind;
    li.appendChild(svgIcon(glyphMap[item.kind], 14));
    li.appendChild(document.createTextNode(item.label));
    ul.append(li);
  }
  bar.append(ul);
}

/* ------------------------------------------------------------------ */
/* Re-render                                                           */
/* ------------------------------------------------------------------ */

function renderUploadLimits() {
  const el = $('#upload-limits');
  if (el) el.textContent = t('upload.limits', { max: MAX_FILES, mb: MAX_TOTAL_MB });
}

function renderAll() {
  renderTenderSummary();
  renderProgressMeter();
  renderUploadLimits();
  renderRequirements();
  renderFileList();
  renderBlockingBar();
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function wireUpload() {
  const input = $('#file-input');
  const dropzone = $('#dropzone');
  const browseBtn = $('#browse-btn');
  const errorEl = $('#upload-error');

  // Clicking anywhere in the dropzone opens the file picker
  if (dropzone && input) {
    dropzone.addEventListener('click', e => {
      // Don't double-trigger if the browse button was clicked
      if (e.target === browseBtn) return;
      input.click();
    });
  }

  if (browseBtn && input) {
    browseBtn.addEventListener('click', e => {
      e.stopPropagation(); // prevent dropzone handler from also firing
      input.click();
    });
  }

  if (input) {
    input.addEventListener('change', async () => {
      const errs = await addFiles(input.files);
      showUploadErrors(errs);
      input.value = '';
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', async e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const errs = await addFiles(e.dataTransfer.files);
      showUploadErrors(errs);
    });
  }

  function showUploadErrors(errs) {
    if (!errorEl) return;
    if (errs.length === 0) { errorEl.hidden = true; errorEl.textContent = ''; return; }
    errorEl.hidden = false;
    errorEl.textContent = [...new Set(errs)].join(' ');
  }
}

function wireGenerate() {
  const btn = $('#generate-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    generatePDF().catch(e => {
      console.error(e);
      alert(t('generate.error'));
    });
  });
}

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

export async function initApp() {
  // Try to load external requirements.json (for unseen packs)
  try {
    const resp = await fetch('./documents/requirements.json');
    if (resp.ok) {
      const data = await resp.json();
      if (data.tender && Array.isArray(data.requirements)) {
        tender = data.tender;
        requirements = data.requirements;
      }
    }
    // If not ok (404 etc.), silently use embedded defaults
  } catch { /* network error — use embedded defaults */ }

  wireUpload();
  wireGenerate();
  document.addEventListener('languagechange', () => renderAll());
  renderAll();
}