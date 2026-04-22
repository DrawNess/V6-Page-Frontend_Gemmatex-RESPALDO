const EXTERNAL_RE = /^(https?:\/\/|mailto:|tel:)/i;

export function resolveLink(url: string | null | undefined): { routerLink: string | null; href: string | null } {
  const v = (url ?? '').trim();
  if (!v) return { routerLink: null, href: null };
  if (v.startsWith('/')) return { routerLink: v, href: null };
  if (EXTERNAL_RE.test(v)) return { routerLink: null, href: v };
  if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/i.test(v)) return { routerLink: null, href: `https://${v}` };
  return { routerLink: null, href: null };
}
