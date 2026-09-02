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

function isKnownType(t: PublicProperty['type']): t is PropertyType {
  return (['villa', 'apartment', 'finca', 'penthouse'] as PublicProperty['type'][]).includes(
    t as PropertyType
  );
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

function focalPointToObjectPosition(
  focalPoint: { x: number; y: number } | undefined
): string | null {
  if (!focalPoint) return null;
  // Nivora usa coordenadas 0-100 (0,0 = top-left, 100,100 = bottom-right)
  // CSS object-position usa porcentajes con mismo significado
  return `center ${focalPoint.y}% center ${focalPoint.x}%`;
}

// ── Mapper Nivora → Property (modelo UI) ────────────────────────────

function fromNivora(np: PublicProperty): Property {
  // Type: mapping explícito. Si Nivora devuelve un type no soportado por
  // la UI, caemos a 'villa' (legacy). En el futuro añadiríamos 'house'/'chalet'.
  const propertyType: PropertyType = isKnownType(np.type) ? np.type : 'villa';

  // Operación: Nivora ya devuelve 'rent' | 'sale' literales.
  const transaction: Property['transaction'] = np.operation;

  // Precio: amountCents (entero) → euros (decimal).
  const priceEuros = np.pricing.amountCents / 100;

  // Imágenes: isCover primero, luego position ascendente.
  const images = orderImages(np.images);

  // Focal point de la imagen de portada (la primera del array ordenado).
  const coverImage = images.length > 0 ? np.images.find((i) => i.isCover) : null;
  const imageFocal = coverImage?.focalPoint
    ? focalPointToObjectPosition(coverImage.focalPoint)
    : null;

  // No inventamos maxGuests, no leemos address/area/usableAreaSqm/plotAreaSqm.
  // Solo lo que el contrato envía explícitamente.
  return {
    id: np.id,
    slug: np.slug,
    type: propertyType,
    transaction,
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
    bedrooms: np.specs.bedrooms ?? 0,
    bathrooms: np.specs.bathrooms ?? 0,
    sizeM2: np.specs.builtAreaSqm ?? 0,
    amenidades: np.features.es ?? [],
    images,
    imageFocal: imageFocal ?? '62%',
    featured: np.featured,
    // No incluimos publishedAt/updatedAt en el modelo Property — la UI
    // actual no los expone. Si la UI los muestra, se añade el campo.
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
