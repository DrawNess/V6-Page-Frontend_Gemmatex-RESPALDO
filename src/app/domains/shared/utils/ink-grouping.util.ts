import { Product } from '@shared/models/product.model';
import { cleanInkName, isLikelyEpsonInkProduct, productInkHaystack, productInkModelHaystack } from './ink-utils';

export interface InkGroupingOptions {
  modelAliasFamilies?: string[][];
}

function containsWord(haystack: string, token: string): boolean {
  return new RegExp(`\\b${token}\\b`).test(haystack);
}

function extractModelTokens(haystack: string): string[] {
  const matches = haystack.match(/\b(?:f|g|t)\d{3,5}[a-z]?\b/g) ?? [];
  return Array.from(new Set(matches));
}

function resolveFamilyKey(modelHaystack: string, p: Product): string {
  // Reglas explícitas pedidas por negocio.
  if (containsWord(modelHaystack, 'f170') || containsWord(modelHaystack, 'f570')) return 'f170-f570';
  if (containsWord(modelHaystack, 'f6200')) return 'f6200';
  if (containsWord(modelHaystack, 'f6370')) return 'f6370';
  if (containsWord(modelHaystack, 'f6470') || containsWord(modelHaystack, 'f6470h')) return 'f6470-f6470h';
  if (containsWord(modelHaystack, 'g6070')) return 'g6070';

  // Fallback automático (ej: T3170X).
  const tokens = extractModelTokens(modelHaystack);
  if (tokens.length) return tokens.sort().join('+');
  // Sin token de modelo: no forzar agrupación entre productos distintos.
  return `id:${p.id}`;
}

function representativeScore(p: Product): number {
  const h = productInkHaystack(p);
  let score = 0;
  // Priorizamos títulos comerciales limpios para la tarjeta representante.
  if (containsWord(h, 'epson')) score += 4;
  if (containsWord(h, 'tinta') || containsWord(h, 'ink')) score += 3;
  if (p.name && p.name.trim().length > 8) score += 2;
  return score;
}

function pickRepresentative(items: Product[]): Product {
  const chosen = [...items].sort((a, b) => {
    const byScore = representativeScore(b) - representativeScore(a);
    if (byScore !== 0) return byScore;
    return Number(a.id) - Number(b.id);
  })[0];

  return { ...chosen, name: cleanInkName(chosen) };
}

export function groupEpsonInkProducts(products: Product[], _options: InkGroupingOptions = {}): Product[] {
  if (!products.length) return products;

  const candidates = products.filter((p) => isLikelyEpsonInkProduct(p));
  const passthrough = products.filter((p) => !isLikelyEpsonInkProduct(p));
  if (!candidates.length) return products;

  const groups = new Map<string, Product[]>();
  for (const p of candidates) {
    const familyKey = resolveFamilyKey(productInkModelHaystack(p), p);
    if (!groups.has(familyKey)) groups.set(familyKey, []);
    groups.get(familyKey)!.push(p);
  }

  return [...passthrough, ...Array.from(groups.values()).map(pickRepresentative)];
}
