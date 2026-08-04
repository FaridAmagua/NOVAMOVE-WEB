import es from '../i18n/es.json';
import en from '../i18n/en.json';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export const supportedLocales = ['es', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = 'es';

/**
 * Centralised list of locales — used both by getStaticPaths and helpers.
 */
export const localeParams = supportedLocales.map(locale => ({ params: { locale } }));

const translations = { es, en } as const;

/**
 * Get a translation by dot-notation key.
 * Falls back to Spanish, then to the key itself.
 * Supports both strings and arrays of strings.
 */
export function t(
  locale: Locale,
  key: string
): string | string[] {
  const dict = translations[locale] ?? translations[defaultLocale];
  const fallbackDict = translations[defaultLocale];
  const parts = key.split('.');
  const resolve = (d: any): string | string[] | undefined => {
    let cur: any = d;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    if (typeof cur === 'string' || (Array.isArray(cur) && cur.every(x => typeof x === 'string'))) {
      return cur;
    }
    return undefined;
  };
  const result = resolve(dict) ?? resolve(fallbackDict);
  if (result !== undefined) return result;
  return key;
}

/**
 * Build a locale-prefixed path with trailing slash (canonical form).
 * Examples:
 *   localizedPath('es', '/')         -> '/es/'
 *   localizedPath('es', '/about')    -> '/es/about/'
 *   localizedPath('es', '/blog/x')   -> '/es/blog/x'
 *   localizedPath('es', '/blog/x/')  -> '/es/blog/x/'
 */
export function localizedPath(locale: Locale, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const joined = `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
  // Ensure trailing slash for collection routes (not for files like /blog/[slug])
  // Heuristic: paths with a single trailing alphanumeric segment are leaf routes (no slash).
  const parts = joined.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  // If the last segment has a file extension, don't add trailing slash
  if (/\.[a-z0-9]+$/i.test(last)) return joined;
  // Otherwise make sure it ends with '/'
  return joined.endsWith('/') ? joined : joined + '/';
}

/**
 * Swap the locale segment of a path while keeping the rest of the URL.
 */
export function swapLocaleInPath(currentPath: string, targetLocale: Locale): string {
  const segments = currentPath.split('/').filter(Boolean);
  if (segments.length === 0) return localizedPath(targetLocale, '/');
  // Replace first segment if it is a known locale, else prepend target locale.
  if (segments[0] === 'es' || segments[0] === 'en') {
    segments[0] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }
  let result = '/' + segments.join('/');
  // Preserve trailing slash from input
  if (currentPath.endsWith('/') && !result.endsWith('/')) result += '/';
  // Run through localizedPath for consistency
  return result;
}

/**
 * Extract the locale from an Astro URL.pathname.
 */
export function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg === 'en' || seg === 'es') return seg;
  return defaultLocale;
}

/**
 * Strip the locale segment from a pathname.
 */
export function stripLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] === 'es' || seg[0] === 'en') return '/' + seg.slice(1).join('/');
  return pathname;
}