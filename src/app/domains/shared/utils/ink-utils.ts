import { Product } from '@shared/models/product.model';

export type InkColor = { label: string; swatch: string; variants: string[] };

// Lista principal de colores de tinta (ordenada)
export const INK_COLORS: InkColor[] = [
  // Orden principal solicitado: C, M, Y, K
  { label: 'Cian', swatch: '#0ea5e9', variants: ['cian', 'cyan', '(c)', 'c)'] },
  { label: 'Magenta', swatch: '#F50078', variants: ['magenta', '(m)', 'm)'] },
  { label: 'Amarillo', swatch: '#E4CA00', variants: ['amarillo', 'yellow', '(y)', 'y)'] },
  { label: 'Negro', swatch: '#0f172a', variants: ['negro', 'black', 'bk', 'k', 'hdk', 'hd-k'] },
  { label: 'Fluor Yellow', swatch: '#fef08a', variants: ['fluor-yellow', 'fluor yellow', 'yellow-fluor', 'yellow fluor', 'fluor y', 'fy', 'yfl', 'fluorescente-amarillo', 'amarillo-fluor', '(fy)', 'fy)', '(fy'] },
  { label: 'Fluor Pink', swatch: '#fb7185', variants: ['fluor-pink', 'fluor pink', 'pink-fluor', 'pink fluor', 'fp', 'pfl', 'fluorescente-rosa', 'rosa-fluor', '(fp)', 'fp)', '(fp'] },
  { label: 'Light Cian', swatch: '#67e8f9', variants: ['light-cian', 'light-cyan', 'lc', 'cian-claro', '(lc)', 'lc)', '(lc'] },
  { label: 'Light Magenta', swatch: '#f472b6', variants: ['light-magenta', 'lm', 'magenta-claro', '(lm)', 'lm)', '(lm'] },
  { label: 'Blanco', swatch: '#f8fafc', variants: ['blanco', 'white', 'wh', 'w'] },
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
const INK_GENERIC_TOKENS = new Set(['tinta', 'tintas', 'ink', 'epson', 'botella', 'cartucho']);
const MODEL_TOKEN_RE = /\b(?:f|g|t)\d{3,5}[a-z]?\b/;
const INK_HINT_RE = /\b(?:tinta|tintas|ink|ultrachrome|hdk|cyan|cian|magenta|yellow|amarillo|black|negro|white|blanco|fluor|maintenance|mantenimiento)\b/;

function normalizeInkModelToken(token: string): string {
  const t = token.toLowerCase();
  // F170 y F570 usan la misma tinta: misma clave para agrupar
  if (t === 'f170' || t === 'f570') return 'f170f570';
  return t;
}

export function normalizeInkText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function productInkHaystack(p?: Product | null): string {
  if (!p) return '';
  return normalizeInkText(
    [
      p.name,
      p.slug,
      p.sku,
      p.brand,
      (p as any)?.subcategory?.name,
      (p as any)?.subcategory?.slug,
      (p as any)?.subcategory,
      (p as any)?.category?.name,
      (p as any)?.category?.slug,
      (p as any)?.categoryName,
      ...(Array.isArray((p as any)?.tags) ? (p as any).tags : []),
    ].join(' ')
  );
}

export function productInkModelHaystack(p?: Product | null): string {
  if (!p) return '';
  return normalizeInkText(
    [
      p.name,
      p.slug,
      p.sku,
      ...(Array.isArray((p as any)?.tags) ? (p as any).tags : []),
    ].join(' ')
  );
}

export function hasInkModelToken(text: string): boolean {
  return MODEL_TOKEN_RE.test(normalizeInkText(text));
}

export function isLikelyEpsonInkProductText(text: string): boolean {
  const normalized = normalizeInkText(text);
  const hasEpsonWord = /\bepson\b/.test(normalized);
  const hasModel = MODEL_TOKEN_RE.test(normalized);
  const hasInkHint = INK_HINT_RE.test(normalized);
  return hasInkHint && (hasEpsonWord || hasModel);
}

export function isLikelyEpsonInkProduct(p?: Product | null): boolean {
  return isLikelyEpsonInkProductText(productInkHaystack(p));
}

function normalizeInkCodeFamily(token: string): string {
  const t = token.toLowerCase();
  if (!INK_T_CODE_RE.test(t)) return t;
  // T49M1 -> t49m / T7413 -> t741
  if (t.length >= 5 && /\d$/.test(t)) return t.slice(0, -1);
  return t;
}

export function isInkSubcategory(p?: Product | null): boolean {
  if (isInkSubcategoryStrict(p)) return true;

  // Fallback cuando backend no envía subcategory expandida.
  return INK_HINT_RE.test(productInkHaystack(p));
}

export function isInkSubcategoryStrict(p?: Product | null): boolean {
  const subText = normalizeInkText(
    [
      (p as any)?.subcategory?.name,
      (p as any)?.subcategory?.slug,
      (p as any)?.subcategory,
    ].join(' ')
  );
  return subText.includes('tinta');
}

export function detectInkColor(p: Product): InkColor {
  const haystack = `${p.name || ''} ${p.slug || ''} ${p.sku || ''}`.toLowerCase();
  // Prioridad de detección: primero variantes específicas para evitar colisión
  // (ej: "yellow fluor" no debe caer como "yellow").
  const detectionPriority = [
    ...INK_COLORS.filter((c) => c.label === 'Fluor Yellow' || c.label === 'Fluor Pink'),
    ...INK_COLORS.filter((c) => c.label !== 'Fluor Yellow' && c.label !== 'Fluor Pink'),
  ];

  for (const color of detectionPriority) {
    if (color.variants.some(v => haystack.includes(v))) {
      return color;
    }
  }
  return { label: 'Color', swatch: '#94a3b8', variants: [] };
}

export function inkBaseKey(p?: Product | null): string | null {
  if (!p) return null;
  const source = `${p.slug || ''} ${p.name || ''} ${p.sku || ''}`.toLowerCase();
  if (!source) return null;

  // normalizamos, eliminando paréntesis y signos
  const cleaned = source.replace(/[^a-z0-9]+/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean).map(normalizeInkModelToken);

  // Si hay códigos Epson T..., usar familia de código para evitar mezclar modelos distintos.
  const modelFamilies = tokens
    .filter(t => INK_T_CODE_RE.test(t))
    .map(normalizeInkCodeFamily);
  const uniqueModels = modelFamilies.filter((t, i, arr) => arr.indexOf(t) === i);
  if (uniqueModels.length) return uniqueModels.join('-');

  const filtered = tokens.filter(t => {
    if (INK_COLOR_TOKENS.has(t)) return false;
    if (INK_COLOR_TOKEN_PARTS.has(t)) return false;
    if (INK_GENERIC_TOKENS.has(t)) return false;
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
    if (INK_T_CODE_RE.test(low) || INK_T_CODE_RE.test(simple)) {
      const family = normalizeInkCodeFamily(simple).toUpperCase();
      if (kept[kept.length - 1] !== family) kept.push(family);
      continue;
    }
    if (/^\d+ml$/i.test(low) || /^\d+ml$/i.test(simple)) break;
    if (low === 'ml' || simple === 'ml') break;
    if (/^\d+$/.test(low) || /^\d+$/.test(simple)) break;

    kept.push(token);
  }

  const cleaned = kept.join(' ').trim();
  return cleaned || normalized;
}
