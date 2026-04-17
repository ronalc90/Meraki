/**
 * Preferencias del usuario persistidas en localStorage.
 * Scoped por "owner" (cuenta) para que cada usuario tenga las suyas.
 */

export type PrintFontSize = 'small' | 'medium' | 'large';

const DEFAULT_PRINT_FONT_SIZE: PrintFontSize = 'medium';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function keyFor(owner: string | null | undefined, name: string): string {
  const scope = (owner ?? 'default').trim() || 'default';
  return `meraki.pref.${scope}.${name}`;
}

export function getPrintFontSize(owner: string | null | undefined): PrintFontSize {
  if (!isBrowser()) return DEFAULT_PRINT_FONT_SIZE;
  try {
    const v = window.localStorage.getItem(keyFor(owner, 'print_font_size'));
    if (v === 'small' || v === 'medium' || v === 'large') return v;
  } catch { /* ignore */ }
  return DEFAULT_PRINT_FONT_SIZE;
}

export function setPrintFontSize(owner: string | null | undefined, value: PrintFontSize): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(keyFor(owner, 'print_font_size'), value);
  } catch { /* ignore */ }
}

export const PRINT_FONT_LABELS: Record<PrintFontSize, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
};
