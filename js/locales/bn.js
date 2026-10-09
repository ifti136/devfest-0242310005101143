/**
 * বাংলা locale — keys must match en.js exactly.
 * Bangla must be natural, not word-for-word.
 * Flag any string needing human review with // REVIEW.
 */

export default {
  nav: {
    home: "হোম",
    topbar: "টেন্ডার প্যাকেজ বিল্ডার",
    tagline: "টেন্ডার ডকুমেন্ট প্যাকেজ মিলিয়ে তৈরি করুন",
  },

  tender: {
    summary: "টেন্ডার সারসংক্ষেপ",
    id: "টেন্ডার আইডি",
    title: "শিরোনাম",
    entity: "ক্রয়কর্তা সংস্থা",
    bidder: "বিডার",
    deadline: "জমার শেষ তারিখ",
    generated: "তৈরির তারিখ",
    doc_list: "অন্তর্ভুক্ত ডকুমেন্ট",
  },

  requirements: {
    heading: "প্রয়োজনীয়তা",
    order: "ক্রম",
    title: "ডকুমেন্ট",
    status: "অবস্থা",
    match: "ফাইল মিলান",
    required: "আবশ্যক",
    optional: "ঐচ্ছিক",
    has_expiry: "মেয়াদ আছে",
  },

  status: {
    missing: "নেই",
    expiry_needed: "মেয়াদ তারিখ দরকার",
    expired: "মেয়াদোত্তীর্ণ",
    not_provided: "দেওয়া হয়নি",
    ok: "ঠিক আছে",
    blocks: "বাধা",
  },

  expiry: {
    label: "মেয়াদ",
    placeholder: "YYYY-MM-DD",
  },

  upload: {
    heading: "আপলোড করা ফাইল",
    drop: "এখানে PDF ড্রপ করুন",
    or: "অথবা",
    browse: "ফাইল নির্বাচন করুন",
    empty: "এখনো কোন PDF যোগ করা হয়নি — এখানে ফাইল ড্রপ করুন",
    rejected: "শুধুমাত্র PDF ফাইল যোগ করা যাবে", // REVIEW
    too_many: "সর্বোচ্চ {max}টি ফাইল যোগ করা যাবে",
    too_large: "মোট আকার {max} MB-এর মধ্যে থাকতে হবে",
    pages: "{count} পৃষ্ঠা",
    duplicate: "ডুপ্লিকেট", // REVIEW
    matched_to: "{name} এর সাথে মিলেছে",
    unmatched: "মেলেনি",
    remove: "ফাইল সরান",
  },

  blocking: {
    heading: "এখনো তৈরি করা যাচ্ছে না",
    missing: "{count}টি আবশ্যক ডকুমেন্ট নেই",
    expiry_needed: "{count}টি ডকুমেন্টের মেয়াদ তারিখ দরকার",
    expired: "{count}টি ডকুমেন্টের মেয়াদ শেষ",
    duplicate_match: "ডুপ্লিকেট ফাইল ভিন্ন প্রয়োজনে মেলানো হয়েছে", // REVIEW
  },

  generate: {
    button: "প্যাকেজ তৈরি করুন",
    loading: "তৈরি হচ্ছে…",
    disabled: "সব সমস্যা সমাধান করে তৈরি করুন",
    success: "প্যাকেজ ডাউনলোড হয়েছে",
    error: "প্যাকেজ তৈরি করা যায়নি",
    embed_error: "{name} যুক্ত করা যায়নি — বাদ দেওয়া হয়েছে",
  },

  toggle: {
    en: "EN",
    bn: "বাংলা",
  },

  a11y: {
    lang_toggle: "ভাষা নির্বাচন",
    remove_file: "{name} সরান",
    match_select: "{name} এর জন্য ফাইল মিলান",
    expiry_input: "{name} এর মেয়াদ তারিখ",
  },
};