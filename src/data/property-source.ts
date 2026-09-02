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
  type NivoraImage,
  type NivoraProperty,
  type NivoraSpecs,
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

const KNOWN_PROPERTY_TYPES = new Set<PropertyType>([
  'villa', 'apartment', 'finca', 'penthouse',
]);

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
};

/**
 * Lee un campo localizado de Nivora.
 * `field` puede ser:
 *   - el objeto `{ es, en? }` del contrato (lo normal)
 *   - un valor crudo (string, number, etc.) si Nivora no localizó
 *   - undefined si el campo no existe
 */
function pick<T>(
  field: { es: T; en?: T } | T | undefined | null,
  fallback: T,
  preferEn = false
): T {
  if (field === undefined || field === null) return fallback;
  if (typeof field !== 'object' || !('es' in (field as object))) {
    return field as T;
  }
  const { es, en } = field as { es: T; en?: T };
  if (preferEn && en !== undefined && en !== null) return en;
  if (en !== undefined && en !== null) return en;
  if (es !== undefined && es !== null) return es;
  return fallback;
}

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

// ── Helpers de Nivora ────────────────────────────────────────────────────

function readSpecNumber(specs: NivoraSpecs | undefined, key: string): number | undefined {
  if (!specs) return undefined;
  const v = specs[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function readSpecString(specs: NivoraSpecs | undefined, key: string): string | undefined {
  if (!specs) return undefined;
  const v = specs[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function splitFeatures(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function orderImages(images: NivoraImage[] | undefined): string[] {
  if (!images || images.length === 0) return [];
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return sorted.map((i) => i.url);
}

// ── Mapper Nivora → Property ────────────────────────────────────────────

function fromNivora(np: NivoraProperty): Property {
  const propertyType: PropertyType = KNOWN_PROPERTY_TYPES.has(np.type as PropertyType)
    ? (np.type as PropertyType)
    : 'villa';

  const transaction: Property['transaction'] = np.operation === 'sale' ? 'sale' : 'rent';

  // Precio: amountCents (entero) → euros (decimal)
  const priceEuros = np.pricing.amountCents / 100;

  // Specs: leer campos tipados con fallback seguro
  const bedrooms = readSpecNumber(np.specs, 'bedrooms') ?? readSpecNumber(np.specs, 'rooms') ?? 0;
  const bathrooms = readSpecNumber(np.specs, 'bathrooms') ?? 0;
  const sizeM2 = readSpecNumber(np.specs, 'sizeM2') ?? readSpecNumber(np.specs, 'area') ?? 0;
  const maxGuests = readSpecNumber(np.specs, 'maxGuests') ?? readSpecNumber(np.specs, 'guests') ?? 2;

  // Features: Nivora devuelve `{es, en}` como string (separado por comas).
  const featuresEsRaw = pick(np.features?.es, '');
  const featuresEnRaw = pick(np.features?.en, featuresEsRaw);
  const featuresES = splitFeatures(typeof featuresEsRaw === 'string' ? featuresEsRaw : '');
  const featuresEN = splitFeatures(typeof featuresEnRaw === 'string' ? featuresEnRaw : '');
  const amenities = featuresEN.length > 0 ? featuresEN : featuresES;

  // Imágenes ordenadas por position
  const images = orderImages(np.images);

  return {
    id: np.id,
    slug: np.slug,
    type: propertyType,
    transaction,
    destination: np.zone ?? 'spain',
    name: {
      es: pick(np.content?.title?.es, ''),
      en: pick(np.content?.title?.en, np.content?.title?.es ?? ''),
    },
    tagline: {
      es: pick(np.content?.tagline?.es, ''),
      en: pick(np.content?.tagline?.en, np.content?.tagline?.es ?? ''),
    },
    description: {
      es: pick(np.content?.description?.es, ''),
      en: pick(np.content?.description?.en, np.content?.description?.es ?? ''),
    },
    location: {
      es: readSpecString(np.specs, 'addressEs') ?? readSpecString(np.specs, 'address') ?? '',
      en: readSpecString(np.specs, 'addressEn') ?? readSpecString(np.specs, 'address') ?? '',
    },
    price: priceEuros,
    bedrooms,
    bathrooms,
    sizeM2,
    maxGuests,
    amenities,
    images,
    imageFocal: '62%',
    featured: np.featured,
    lat: np.lat,
    lng: np.lng,
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
      console.warn(`[properties] Nivora no disponible (${err.message}), usando fixture local.`);
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
