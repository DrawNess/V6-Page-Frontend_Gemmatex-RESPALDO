import { Product } from '@shared/models/product.model';
import { INK_COLORS, cleanInkName, colorOrder, isInkSubcategory } from './ink-utils';

export interface InkGroupingOptions {
  modelAliasFamilies?: string[][];
}

const DEFAULT_MODEL_ALIAS_FAMILIES: string[][] = [
  // Business rule requested by catalog team: these models are shown as one ink family.
  ['F6470', 'F6470H', 'F9570'],
];

const INK_COLOR_TOKENS = new Set(
  INK_COLORS.flatMap((c) => [c.label, ...c.variants])
    .flatMap((v) => v.toLowerCase().split(/[^a-z0-9]+/))
    .filter(Boolean)
);

const GENERIC_DROP_TOKENS = new Set([
  'epson',
  'surecolor',
  'tinta',
  'tintas',
  'ink',
  'ultrachrome',
  'ds',
  'df',
  'hd',
  'hdk',
  'paquete',
  'pack',
  'cartucho',
  'botella',
  'ml',
]);

function modelAliasMap(families: string[][]): Map<string, string> {
  const map = new Map<string, string>();
  families.forEach((family, idx) => {
    const canonical = `family_${idx + 1}`;
    family.forEach((token) => map.set(token.toLowerCase(), canonical));
  });
  return map;
}

function modelTokensFromText(text: string): string[] {
  const found = text.toLowerCase().match(/\b[fg]\d{3,4}h?\b/g) ?? [];
  return Array.from(new Set(found));
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isLikelyEpsonInkProduct(p: Product): boolean {
  if (!isInkSubcategory(p)) return false;
  const raw = `${p.name ?? ''} ${(p as any).brand ?? ''} ${p.slug ?? ''} ${(p as any).sku ?? ''}`;
  return normalizeText(raw).includes('epson');
}

function dropToken(t: string): boolean {
  if (!t) return true;
  if (INK_COLOR_TOKENS.has(t)) return true;
  if (GENERIC_DROP_TOKENS.has(t)) return true;
  if (/^t\d{2,}[a-z]?\d*$/i.test(t)) return true;
  if (/^\d+ml$/.test(t) || /^\d+$/.test(t)) return true;
  return false;
}

function buildInkGroupKey(
  p: Product,
  aliases: Map<string, string>
): string {
  const source = normalizeText(`${p.name ?? ''} ${p.slug ?? ''} ${(p as any).sku ?? ''}`);
  const models = modelTokensFromText(source).map((m) => aliases.get(m) ?? m);
  const modelPart = Array.from(new Set(models)).sort().join('+');

  const modelSet = new Set(modelTokensFromText(source));
  const core = source
    .split(/\s+/)
    .filter((t) => !modelSet.has(t))
    .filter((t) => !dropToken(t));
  const corePart = Array.from(new Set(core)).join('-') || 'ink';

  return `${modelPart || 'model_unknown'}|${corePart}`;
}

function selectRepresentative(items: Product[]): Product {
  const sorted = [...items].sort((a, b) => {
    const byColor = colorOrder(a) - colorOrder(b);
    if (byColor !== 0) return byColor;
    return Number(a.id) - Number(b.id);
  });
  const chosen = sorted[0];
  return { ...chosen, name: cleanInkName(chosen) };
}

export function groupEpsonInkProducts(
  products: Product[],
  options: InkGroupingOptions = {}
): Product[] {
  if (!products.length) return products;

  const aliasMap = modelAliasMap(options.modelAliasFamilies ?? DEFAULT_MODEL_ALIAS_FAMILIES);
  const groups = new Map<string, Product[]>();

  for (const p of products) {
    if (!isLikelyEpsonInkProduct(p)) {
      groups.set(`raw-${p.id}`, [p]);
      continue;
    }

    const key = buildInkGroupKey(p, aliasMap);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return Array.from(groups.values()).map(selectRepresentative);
}

