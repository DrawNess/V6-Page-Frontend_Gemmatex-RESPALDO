import { HttpErrorResponse } from '@angular/common/http';

export interface ParseApiErrorOptions {
  fallback?: string;
  statusMessages?: Partial<Record<number, string>>;
}

export function parseApiError(err: unknown, options: ParseApiErrorOptions = {}): string {
  if (!(err instanceof HttpErrorResponse)) {
    return options.fallback ?? 'Ocurrió un error inesperado.';
  }

  const data = err.error as Record<string, unknown> | string | null;

  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    const msg = data['message'];
    if (Array.isArray(msg)) return (msg as string[]).join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;

    const dataError = data['error'];
    if (typeof dataError === 'string' && dataError.trim()) return dataError;

    const arr = (data['errors'] ?? data['details']) as unknown[] | undefined;
    if (Array.isArray(arr) && arr.length) {
      return arr
        .map((e) =>
          typeof e === 'string' ? e : ((e as { message?: string })?.message ?? '')
        )
        .filter(Boolean)
        .join(' | ');
    }
  }

  const statusMsg = options.statusMessages?.[err.status];
  if (statusMsg) return statusMsg;

  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return options.fallback ?? `Error (${err.status}). Intenta nuevamente.`;
}
