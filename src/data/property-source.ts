/// <reference types="node" />
// src/data/property-source.ts
//
// Fuente única de propiedades para NOVAMOVE-WEB.
//
// Reglas:
//   - Producción: consulta Nivora. Si falla → build roto.
//   - Desarrollo: intenta Nivora; si no hay variables o hay NivoraError,
//     cae al fixture local para no bloquear el dev server.
//   - Catálogo vacío: válido en cualquier entorno. No lanza error.

import {
  properties as fallbackProperties,
  type Property,
  type PropertyType,
} from './properties';
import {
  fetchNivoraCatalog,
  NivoraError,
  type LocalizedPropertyContent,
  type PublicProperty,
} from './nivora-catalog';

export type { Property, PropertyType } from './properties';
export type SourceName = 'nivora' | 'fallback';

export interface PropertySource {
  name: SourceName;
  properties: Property[];
  fetchedAt?: number;
}

const IS_PRODUCTION = ['production', 'prod'].includes(
  (process.env['NODE_ENV'] ?? '').toLowerCase()
) || ['production', 'prod'].includes((process.env['CONTEXT'] ?? '').toLowerCase())
  || !!process.env['CI'];

// ── Tipo de UI canónico (mapea Nivora → modelo web) ────────────────────
//
// El modelo `Property` (en ./properties.ts) es lo que consume la UI.
// Esta capa mapea el contrato Nivora (PublicProperty) a ese modelo.

const KNOWN_ZONES: Record<string, { es: string; en: string }> = {
  madrid:    { es: 'Madrid',           en: 'Madrid' },
  barcelona: { es: 'Barcelona',        en: 'Barcelona' },
  marbella:  { es: 'Marbella',         en: 'Marbella' },
  mallorca:  { es: 'Mallorca',         en: 'Mallorca' },
  ibiza:     { es: 'Ibiza',            en: 'Ibiza' },
  canarias:  { es: 'Canarias',         en: 'Canary Islands' },
  valencia:  { es: 'Valencia',         en: 'Valencia' },
  sevilla:   { es: 'Sevilla',          en: 'Seville' },
  malaga:    { es: 'Málaga',           en: 'Málaga' },
  sitges:    { es: 'Sitges',           en: 'Sitges' },
  palma:     { es: 'Palma de Mallorca', en: 'Palma de Mallorca' },
};

function prettyZone(zone: string): string {
  return zone
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function zoneLabel(zone: string, locale: 'es' | 'en'): string {
  const known = KNOWN_ZONES[zone.toLowerCase()];
  if (known) return known[locale] ?? known.es;
  return prettyZone(zone);
}

// ── Helpers de mapping Nivora → UI ─────────────────────────────────────

type Localized = { es: string; en?: string };

function pickLocalized(
  field: LocalizedPropertyContent | Localized | undefined,
  key: keyof LocalizedPropertyContent | keyof Localized
): string {
  if (!field) return '';
  // 1) Si el campo es el objeto Nivora (content), leer la key solicitada
  if (typeof field === 'object' && 'title' in field && 'description' in field) {
    const value = (field as LocalizedPropertyContent)[key as keyof LocalizedPropertyContent];
    return typeof value === 'string' ? value : '';
  }
  // 2) Compatibilidad: si es un Localized plano, leer por la key
  if (typeof field === 'object' && key in (field as Localized)) {
    const v = (field as Localized)[key as keyof Localized];
    return typeof v === 'string' ? v : '';
  }
  return '';
}

function pickEnWithFallback(
  en: LocalizedPropertyContent | undefined,
  fallback: LocalizedPropertyContent,
  key: keyof LocalizedPropertyContent
): string {
  const fromEn = pickLocalized(en, key);
  return fromEn || pickLocalized(fallback, key);
}

/** Convierte un type de Nivora al PropertyType soportado. Si no
 *  coincide exactamente con uno de los 11 valores, NO convertimos — se
 *  propaga una excepción para que el caller decida qué hacer. */
function requireKnownType(
  np: PublicProperty
): PropertyType {
  const allowed: PublicProperty['type'][] = [
    'apartment', 'house', 'chalet', 'duplex', 'penthouse',
    'studio', 'land', 'commercial', 'office', 'garage', 'other',
  ];
  if (!(allowed as string[]).includes(np.type)) {
    throw new Error(
      `Tipo de Nivora no soportado: "${np.type}" para ${np.id}. ` +
      `Permitidos: ${allowed.join(', ')}`
    );
  }
  return np.type as PropertyType;
}

// ── Orden de imágenes: isCover primero, luego position ascendente ─────

function orderImages(images: PublicProperty['images']): string[] {
  if (!images || images.length === 0) return [];
  const sorted = [...images].sort((a, b) => {
    if (a.isCover && !b.isCover) return -1;
    if (!a.isCover && b.isCover) return 1;
    return a.position - b.position;
  });
  return sorted.map((i) => i.url);
}

// ── Focal point a object-position ──────────────────────────────────────

/** Devuelve CSS `object-position` a partir de `focalPoint` (0-100, 0-100).
 *  Nivora: (x=0, y=0) = top-left. CSS: (x%, y%) donde x=0% = left.
 *  Formato final: `${x}% ${y}%` (sin "center" redundante). */
function focalPointToObjectPosition(
  focalPoint: { x: number; y: number } | undefined
): string | null {
  if (!focalPoint) return null;
  return `${focalPoint.x}% ${focalPoint.y}%`;
}

// ── Mapper Nivora → Property (modelo UI) ────────────────────────────

function fromNivora(np: PublicProperty): Property {
  // Type: si Nivora devuelve un type no soportado, propagamos error.
  const propertyType: PropertyType = requireKnownType(np);

  // Operación: Nivora ya devuelve 'rent' | 'sale' literales.
  const transaction: Property['transaction'] = np.operation;

  // Precio: amountCents (entero) → euros (decimal).
  const priceEuros = np.pricing.amountCents / 100;

  // Features: copiar ES/EN del contrato. Nivora garantiza `es` presente.
  // Si el contrato de Nivora no trae `en` en features, mantenemos lo que
  // llegue. El caller (UI) hará fallback a es si en está vacío.
  const features: Property['features'] = {
    es: Array.isArray(np.features.es) ? np.features.es : [],
    en: Array.isArray(np.features.en) ? np.features.en : [],
  };

  // Imágenes: isCover primero, luego position ascendente.
  const images = orderImages(np.images);

  // imagePosition: desde el focalPoint de la imagen de portada (la
  // primera del array ordenado). Si no hay focalPoint, default.
  const coverImage = images.length > 0 ? np.images.find((i) => i.isCover) : null;
  const imagePosition = coverImage?.focalPoint
    ? focalPointToObjectPosition(coverImage.focalPoint)
    : undefined;

  return {
    id: np.id,
    slug: np.slug,
    reference: np.reference,
    type: propertyType,
    transaction,
    status: np.status,
    destination: np.content.es.publicLocation,
    name: {
      es: pickLocalized(np.content.es, 'title'),
      en: pickEnWithFallback(np.content.en, np.content.es, 'title'),
    },
    tagline: {
      es: pickLocalized(np.content.es, 'tagline'),
      en: pickEnWithFallback(np.content.en, np.content.es, 'tagline'),
    },
    description: {
      es: pickLocalized(np.content.es, 'description'),
      en: pickEnWithFallback(np.content.en, np.content.es, 'description'),
    },
    location: {
      es: pickLocalized(np.content.es, 'publicLocation'),
      en: pickEnWithFallback(np.content.en, np.content.es, 'publicLocation'),
    },
    price: priceEuros,
    features,
    bedrooms: np.specs.bedrooms ?? 0,
    bathrooms: np.specs.bathrooms ?? 0,
    sizeM2: np.specs.builtAreaSqm ?? 0,
    images,
    imagePosition,
    featured: np.featured,
  };
}

// ── Fixture loader ──────────────────────────────────────────────────────

async function loadFixture(): Promise<Property[]> {
  return fallbackProperties;
}

// ── API pública ──────────────────────────────────────────────────────────

export async function getProperties(): Promise<PropertySource> {
  if (!IS_PRODUCTION) {
    try {
      const nivoraProps = await fetchNivoraCatalog();
      return {
        name: 'nivora',
        properties: nivoraProps.map(fromNivora),
        fetchedAt: Date.now(),
      };
    } catch (err) {
      if (!(err instanceof NivoraError)) throw err;
      console.warn(
        `[properties] Nivora no disponible (${err.message}), usando fixture local.`
      );
      return {
        name: 'fallback',
        properties: await loadFixture(),
        fetchedAt: Date.now(),
      };
    }
  }

  // Producción: Nivora o build roto. Catálogo vacío es válido.
  const nivoraProps = await fetchNivoraCatalog();
  return {
    name: 'nivora',
    properties: nivoraProps.map(fromNivora),
    fetchedAt: Date.now(),
  };
}

export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  const { properties } = await getProperties();
  return properties.find((p) => p.slug === slug);
}

export async function getUniqueZones(): Promise<string[]> {
  const { properties } = await getProperties();
  const zones = new Set<string>();
  for (const p of properties) {
    if (p.destination) zones.add(p.destination);
  }
  return Array.from(zones).sort();
}

export async function getFixtureProperties(): Promise<PropertySource> {
  if (IS_PRODUCTION) {
    throw new Error('getFixtureProperties() no está disponible en producción.');
  }
  return {
    name: 'fallback',
    properties: await loadFixture(),
  };
}
