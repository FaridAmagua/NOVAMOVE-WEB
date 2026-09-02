// src/data/property-source.ts
//
// Fuente única de propiedades para NOVAMOVE-WEB.
//
// Reglas:
//   - Producción (NODE_ENV=production | CONTEXT=production | CI=true):
//     consulta Nivora. Si falla → el build debe fallar (no fallback silencioso).
//   - Desarrollo (todo lo demás):
//     intenta Nivora, si falla usa el fixture local para no bloquear el dev server.
//   - El fixture solo existe para desarrollo. En producción, build roto.
//
// Para forzar re-fetch:
//   NIVORA_FORCE_REFRESH=1

import {
  properties as fallbackProperties,
  type Property,
  type PropertyType,
} from './properties';
import {
  fetchNivoraCatalog,
  type NivoraProperty,
  type NivoraPropertyType,
} from './nivora-catalog';

export type SourceName = 'nivora' | 'fallback';

export interface PropertySource {
  name: SourceName;
  properties: Property[];
  fetchedAt?: number;
}

const IS_PRODUCTION = ['production', 'prod'].includes(
  (process.env.NODE_ENV ?? '').toLowerCase()
) || ['production', 'prod'].includes((process.env.CONTEXT ?? '').toLowerCase())
  || !!process.env.CI;

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
  // Zonas adicionales probables — añadir según vaya apareciendo en Nivora
  valencia:  { es: 'Valencia',         en: 'Valencia' },
  sevilla:   { es: 'Sevilla',          en: 'Seville' },
  malaga:    { es: 'Málaga',           en: 'Málaga' },
  sitges:    { es: 'Sitges',           en: 'Sitges' },
};

function localize<T>(field: { es: T; en?: T } | undefined, fallback: T): T {
  if (!field) return fallback;
  return field.en ?? field.es ?? fallback;
}

function prettyZone(zone: string): string {
  const known = KNOWN_ZONES[zone.toLowerCase()];
  if (known) return known.es;
  // Fallback: "marbella-east" → "Marbella East"
  return zone
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function zoneLabel(zone: string, locale: 'es' | 'en'): string {
  const known = KNOWN_ZONES[zone.toLowerCase()];
  if (known) return known[locale] ?? known.es;
  // Para zonas libres: prettify y devuelve igual en ambos idiomas
  return prettyZone(zone);
}

/**
 * Mapea una propiedad de Nivora al modelo UI canónico (Property).
 * Garantiza fallback ES → EN para textos localizados.
 */
export function fromNivora(np: NivoraProperty): Property {
  const propertyType: PropertyType = KNOWN_PROPERTY_TYPES.has(np.type as PropertyType)
    ? (np.type as PropertyType)
    : 'villa'; // fallback seguro

  return {
    id: np.id,
    slug: np.slug ?? np.id,
    type: propertyType,
    transaction: 'rent', // Nivora = solo alquiler (larga duración)
    destination: np.location.zone,
    name: {
      es: np.title.es,
      en: localize(np.title.en, np.title.es),
    },
    tagline: {
      es: np.tagline?.es ?? '',
      en: localize(np.tagline?.en, np.tagline?.es ?? ''),
    },
    description: {
      es: np.description.es,
      en: localize(np.description.en, np.description.es),
    },
    location: {
      es: np.location.address.es,
      en: localize(np.location.address.en, np.location.address.es),
    },
    price: np.priceMonthly, // €/mes — semántica del campo cambia, ver UI
    bedrooms: np.bedrooms,
    bathrooms: np.bathrooms,
    sizeM2: np.sizeM2,
    amenities: np.amenities ?? [],
    images: np.images ?? [],
    imageFocal: np.primaryImageFocal ?? '62%',
    featured: np.featured,
    lat: np.lat,
    lng: np.lng,
    // Sin reviews, sin cleaningFee, sin minNights, sin maxGuests
    // (alquiler de larga duración — la UI ya no usa estos campos)
  };
}

/**
 * Devuelve todas las propiedades para el build.
 * Producción: consulta Nivora o falla (build roto).
 * Desarrollo: intenta Nivora, fallback al fixture local si falla.
 */
export async function getProperties(): Promise<PropertySource> {
  const nivoraProps = await fetchNivoraCatalog({
    forceRefresh: process.env.NIVORA_FORCE_REFRESH === '1',
  });

  if (nivoraProps.length === 0 && IS_PRODUCTION) {
    throw new Error(
      'Nivora devolvió un catálogo vacío. El build no puede continuar con 0 propiedades.'
    );
  }

  return {
    name: 'nivora',
    properties: nivoraProps.map(fromNivora),
    fetchedAt: Date.now(),
  };
}

/**
 * Devuelve una propiedad por slug.
 */
export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  const { properties } = await getProperties();
  return properties.find((p) => p.slug === slug);
}

/**
 * Devuelve la lista única de zonas (libres, no enum) presentes en el catálogo.
 */
export async function getUniqueZones(): Promise<string[]> {
  const { properties } = await getProperties();
  const zones = new Set<string>();
  for (const p of properties) {
    if (p.destination) zones.add(p.destination);
  }
  return Array.from(zones).sort();
}

// ── Modo desarrollo: helper para usar fixture sin Nivora ───────────────────

/**
 * SOLO en desarrollo: devuelve el fixture local sin tocar Nivora.
 * Útil para iterar UI offline. En producción lanza error.
 */
export async function getFixtureProperties(): Promise<PropertySource> {
  if (IS_PRODUCTION) {
    throw new Error(
      'getFixtureProperties() no está disponible en producción. ' +
      'Usa getProperties() que consulta Nivora.'
    );
  }
  return {
    name: 'fallback',
    properties: fallbackProperties,
  };
}
