import en from '../js/locales/en.js';
import bn from '../js/locales/bn.js';

const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]);

const a = new Set(flat(en));
const b = new Set(flat(bn));
const missingInBn = [...a].filter(k => !b.has(k));
const missingInEn = [...b].filter(k => !a.has(k));

console.log({ missingInBn, missingInEn });
process.exit(missingInBn.length || missingInEn.length ? 1 : 0);