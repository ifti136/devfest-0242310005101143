/**
 * English locale file — every user-visible string lives here or in bn.js.
 * Keys must match bn.js exactly.
 */

export default {
  nav: {
    home: "Home",
    topbar: "Tender Package Builder",
    tagline: "Match, check, and build your tender document package",
  },

  tender: {
    summary: "Tender summary",
    id: "Tender ID",
    title: "Title",
    entity: "Procuring entity",
    bidder: "Bidder",
    deadline: "Submission deadline",
    generated: "Date generated",
    doc_list: "Included documents",
  },

  requirements: {
    heading: "Requirements",
    order: "No.",
    title: "Document",
    status: "Status",
    match: "Match file",
    required: "Required",
    optional: "Optional",
    has_expiry: "Has expiry",
  },

  status: {
    missing: "Missing",
    expiry_needed: "Expiry date needed",
    expired: "Expired",
    not_provided: "Not provided",
    ok: "OK",
    blocks: "blocks",
  },

  expiry: {
    label: "Expiry date",
    placeholder: "YYYY-MM-DD",
  },

  upload: {
    heading: "Uploaded files",
    drop: "Drop PDFs here",
    or: "or",
    browse: "Browse files",
    empty: "No PDFs added yet — drop files here",
    rejected: "Only PDF files can be added",
    too_many: "Maximum {max} files allowed",
    too_large: "Total size must stay under {max} MB",
    pages: "{count} pages",
    duplicate: "Duplicate",
    matched_to: "Matched to {name}",
    unmatched: "Unmatched",
    remove: "Remove file",
  },

  blocking: {
    heading: "Cannot generate yet",
    missing: "{count} required document(s) missing",
    expiry_needed: "{count} document(s) need an expiry date",
    expired: "{count} document(s) have expired",
    duplicate_match: "Duplicate files matched to different requirements",
  },

  generate: {
    button: "Generate package",
    loading: "Generating…",
    disabled: "Resolve all blocking issues to generate",
    success: "Package downloaded",
    error: "Could not generate package",
    embed_error: "Could not embed {name} — it was skipped",
  },

  toggle: {
    en: "EN",
    bn: "বাংলা",
  },

  a11y: {
    lang_toggle: "Language selection",
    remove_file: "Remove {name}",
    match_select: "Match a file for {name}",
    expiry_input: "Expiry date for {name}",
  },
};