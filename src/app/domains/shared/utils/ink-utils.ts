import { Product } from '@shared/models/product.model';

export type InkColor = { label: string; swatch: string; variants: string[] };

// Lista principal de colores de tinta (ordenada)
export const INK_COLORS: InkColor[] = [
  { label: 'Fluor Yellow', swatch: '#fef08a', variants: ['fluor-yellow', 'fluor y', 'fy', 'fluorescente-amarillo', 'amarillo-fluor', '(fy)', 'fy)', '(fy'] },
  { label: 'Fluor Pink', swatch: '#fb7185', variants: ['fluor-pink', 'fp', 'fluorescente-rosa', 'rosa-fluor', 'pink-fluor', '(fp)', 'fp)', '(fp'] },
  { label: 'Light Cian', swatch: '#67e8f9', variants: ['light-cian', 'light-cyan', 'lc', 'cian-claro', '(lc)', 'lc)', '(lc'] },
  { label: 'Light Magenta', swatch: '#f472b6', variants: ['light-magenta', 'lm', 'magenta-claro', '(lm)', 'lm)', '(lm'] },
  { label: 'Cian', swatch: '#0ea5e9', variants: ['cian', 'cyan', '(c)', 'c)'] },
  { label: 'Magenta', swatch: '#F50078', variants: ['magenta', '(m)', 'm)'] },
  { label: 'Amarillo', swatch: '#E4CA00', variants: ['amarillo', 'yellow', '(y)', 'y)'] },
  { label: 'Blanco', swatch: '#f8fafc', variants: ['blanco', 'white', 'wh', 'w'] },
  { label: 'Negro', swatch: '#0f172a', variants: ['negro', 'black', 'bk', 'k', 'hdk', 'hd-k'] },
];

const INK_COLOR_TOKENS = new Set(INK_COLORS.flatMap(c => c.variants.map(v => v.toLowerCase())));
const INK_COLOR_TOKEN_PARTS = new Set(
  INK_COLORS.flatMap(c =>
    [...c.variants, c.label]
      .flatMap(v => v.toLowerCase().split(/[^a-z0-9]+/))
      .filter(Boolean)
  )
);
// Códigos de referencia de tinta Epson (ej: T7413, T49M4, T49M1)
const INK_T_CODE_RE = /^t\d{2,}[a-z]?\d*$/i;

function normalizeInkModelToken(token: string): string {
  const t = token.toLowerCase();
  // F170 y F570 usan la misma tinta: misma clave para agrupar
  if (t === 'f170' || t === 'f570') return 'f170f570';
  return t;
}

export function isInkSubcategory(p?: Product | null): boolean {
  const sub =
    (p as any)?.subcategory?.name ??
    (p as any)?.subcategory?.slug ??
    (p as any)?.subcategory ??
    '';
  return String(sub).toLowerCase().includes('tinta');
}

export function detectInkColor(p: Product): InkColor {
  const haystack = `${p.name || ''} ${p.slug || ''} ${p.sku || ''}`.toLowerCase();
  for (const color of INK_COLORS) {
    if (color.variants.some(v => haystack.includes(v))) {
      return color;
    }
  }
  return { label: 'Color', swatch: '#94a3b8', variants: [] };
}

export function inkBaseKey(p?: Product | null): string | null {
  if (!p) return null;
  const source = (p.slug || p.name || '').toLowerCase();
  if (!source) return null;

  // normalizamos, eliminando paréntesis y signos
  const cleaned = source.replace(/[^a-z0-9]+/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean).map(normalizeInkModelToken);

  const filtered = tokens.filter(t => {
    if (INK_COLOR_TOKENS.has(t)) return false;
    if (INK_COLOR_TOKEN_PARTS.has(t)) return false;
    if (INK_T_CODE_RE.test(t)) return false; // códigos Epson tipo T7413
    if (/^\d+ml$/.test(t) || t === 'ml' || /^\d+$/.test(t)) return false; // volumen
    return true;
  });

  if (!filtered.length) return null;
  const unique = filtered.filter((t, i, arr) => arr.indexOf(t) === i);
  return unique.join('-');
}

export function colorOrder(p: Product): number {
  const label = detectInkColor(p).label;
  const idx = INK_COLORS.findIndex(c => c.label === label);
  return idx === -1 ? 999 : idx;
}

export function swatchForColor(label: string): string {
  return INK_COLORS.find(c => c.label === label)?.swatch ?? '#e2e8f0';
}

export function cleanInkName(p: Product): string {
  if (!isInkSubcategory(p)) return p.name || '';

  const source = (p.name || p.slug || '').trim();
  if (!source) return '';

  const normalized = source.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(' ').filter(Boolean);
  const kept: string[] = [];

  for (const token of tokens) {
    const low = token.toLowerCase();
    const simple = low.replace(/[^a-z0-9]/g, '');

    if (INK_COLOR_TOKENS.has(low) || INK_COLOR_TOKENS.has(simple)) break;
    if (INK_COLOR_TOKEN_PARTS.has(low) || INK_COLOR_TOKEN_PARTS.has(simple)) break;
    if (INK_T_CODE_RE.test(low) || INK_T_CODE_RE.test(simple)) break;
    if (/^\d+ml$/i.test(low) || /^\d+ml$/i.test(simple)) break;
    if (low === 'ml' || simple === 'ml') break;
    if (/^\d+$/.test(low) || /^\d+$/.test(simple)) break;

    kept.push(token);
  }

  const cleaned = kept.join(' ').trim();
  return cleaned || normalized;
}
