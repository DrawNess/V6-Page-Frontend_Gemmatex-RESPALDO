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
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const filtered = tokens.filter(t => {
    if (INK_COLOR_TOKENS.has(t)) return false;
    if (INK_COLOR_TOKEN_PARTS.has(t)) return false;
    if (/^t\d{3,}/.test(t)) return false; // códigos Epson tipo T7413
    if (/^\d+ml$/.test(t) || t === 'ml' || /^\d+$/.test(t)) return false; // volumen
    return true;
  });

  if (!filtered.length) return null;
  return filtered.join('-');
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

  const rawTokens = source.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const filtered = rawTokens.filter(t => {
    const low = t.toLowerCase();
    if (INK_COLOR_TOKENS.has(low)) return false;
    if (INK_COLOR_TOKEN_PARTS.has(low)) return false;
    if (/^t\d{3,}/i.test(low)) return false;
    if (/^\d+ml$/i.test(low) || low === 'ml' || /^\d+$/i.test(low)) return false;
    return true;
  });

  const cleaned = filtered.join(' ').trim();
  return cleaned || source;
}
