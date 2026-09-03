// src/data/properties.ts
// Modelo UI canónico + fixture para DESARROLLO.
//
// En PRODUCCIÓN el catálogo lo sirve Nivora (ver property-source.ts).
// Este archivo solo se usa como fallback de desarrollo y como fuente del tipo
// `Property` que el resto de la web consume.
//
// imagePosition: CSS object-position (ej: "50% 60%"). Default "center 62%".

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'chalet'
  | 'duplex'
  | 'penthouse'
  | 'studio'
  | 'land'
  | 'commercial'
  | 'office'
  | 'garage'
  | 'other';

export type TransactionType = 'rent' | 'sale';
export type PropertyStatus = 'available' | 'reserved';

export type DestinationId = string;

export interface Property {
  id: string;
  slug: string;
  reference: string;
  type: PropertyType;
  transaction: TransactionType;
  status: PropertyStatus;
  destination: DestinationId;
  name: { es: string; en: string };
  tagline: { es: string; en: string };
  description: { es: string; en: string };
  location: { es: string; en: string };
  /** Precio: rent = €/mes, sale = precio total. */
  price: number;
  /** Características. UI usa features.es en ES, features.en (fallback a es
   *  si vacío) en EN. */
  features: { es: string[]; en: string[] };
  bedrooms: number;
  bathrooms: number;
  sizeM2: number;
  images: string[];
  /** CSS object-position. */
  imagePosition?: string;
  featured?: boolean;
  lat?: number;
  lng?: number;
  reviews?: Review[];
}

/** Default focal point como CSS object-position. */
export const DEFAULT_IMAGE_FOCAL = 'center 62%';

export interface Review {
  author: { es: string; en: string };
  origin: { es: string; en: string };
  date: string;
  rating: number;
  text: { es: string; en: string };
}

// Fixture mínima (9 propiedades) — el resto se genera dinámicamente con
// propiedades "destacadas" para mostrar el grid en el listing.
export const properties: Property[] = [
  {
    id: 'villa-mediterranea-marbella',
    slug: 'villa-mediterranea-marbella',
    reference: 'GLOBAL-MOVE-MAR-001',
    type: 'villa' as PropertyType,
    transaction: 'rent',
    status: 'available',
    destination: 'marbella',
    name: { es: 'Villa Mediterránea', en: 'Mediterranean Villa' },
    tagline: {
      es: 'Villa de lujo con piscina infinity en la Milla de Oro',
      en: 'Luxury villa with infinity pool on the Golden Mile',
    },
    description: {
      es: 'Espectacular villa de arquitectura contemporánea ubicada en una de las calles más exclusivas de Marbella. Disfruta de vistas panorámicas al Mediterráneo, piscina infinity climatizada, jardín tropical privado y acabados de primer nivel en cada estancia. A 5 minutos en coche de Puerto Banús.',
      en: 'Stunning contemporary-architecture villa on one of Marbella\'s most exclusive streets. Enjoy panoramic Mediterranean views, heated infinity pool, private tropical garden and top-tier finishes throughout. Five minutes by car from Puerto Banús.',
    },
    location: { es: 'Milla de Oro, Marbella', en: 'Golden Mile, Marbella' },
    price: 1850,
    features: {
      es: ['Piscina infinity', 'Wi-Fi alta velocidad', 'Aire acondicionado', 'Parking privado', 'Cocina completa', 'Vistas al mar', 'Jardín privado', 'Gimnasio', 'Concierge'],
      en: ['Infinity pool', 'High-speed Wi-Fi', 'Air conditioning', 'Private parking', 'Full kitchen', 'Sea views', 'Private garden', 'Gym', 'Concierge'],
    },
    bedrooms: 5,
    bathrooms: 5,
    sizeM2: 620,
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1600&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
    ],
    imagePosition: 'center 62%',
    featured: true,
    lat: 36.5097,
    lng: -4.8862,
  },
];

// Etiquetas de tipo (todos los tipos de Nivora)
export const propertyTypeLabel = (type: PropertyType, locale: 'es' | 'en') => {
  const labels: Record<PropertyType, { es: string; en: string }> = {
    apartment:  { es: 'Apartamento',      en: 'Apartment' },
    house:      { es: 'Casa',             en: 'House' },
    chalet:     { es: 'Chalet',           en: 'Chalet' },
    duplex:     { es: 'Dúplex',           en: 'Duplex' },
    penthouse:  { es: 'Ático',            en: 'Penthouse' },
    studio:     { es: 'Estudio',          en: 'Studio' },
    land:       { es: 'Terreno',          en: 'Land' },
    commercial: { es: 'Comercial',        en: 'Commercial' },
    office:     { es: 'Oficina',          en: 'Office' },
    garage:     { es: 'Garaje',           en: 'Garage' },
    other:      { es: 'Otro',             en: 'Other' },
  };
  return labels[type]?.[locale] ?? labels[type].es;
};

// Etiquetas de status
export const statusLabel = (s: PropertyStatus, locale: 'es' | 'en') =>
  s === 'available'
    ? (locale === 'es' ? 'Disponible' : 'Available')
    : (locale === 'es' ? 'Reservado' : 'Reserved');

// Etiquetas de transacción
export const transactionLabel = (t: TransactionType, locale: 'es' | 'en') =>
  t === 'rent'
    ? (locale === 'es' ? 'Alquiler' : 'For rent')
    : (locale === 'es' ? 'Venta' : 'For sale');

/** Helper legacy: normaliza imageFocal antiguo ("62%") a imagePosition ("center 62%"). */
export function normalizeImagePosition(value: string | undefined): string {
  if (!value) return DEFAULT_IMAGE_FOCAL;
  if (value.includes('center') || (value.includes('%') && value.includes(' '))) return value;
  return `center ${value}`;
}

// Amenity labels (mantengo el dict — los amenities vienen como strings
// libres de Nivora; las keys son del legacy fixture).
export const amenityLabel = (key: string, locale: 'es' | 'en'): string => {
  const labels: Record<string, { es: string; en: string }> = {
    pool: { es: 'Piscina', en: 'Pool' },
    wifi: { es: 'Wi-Fi alta velocidad', en: 'High-speed Wi-Fi' },
    ac: { es: 'Aire acondicionado', en: 'Air conditioning' },
    parking: { es: 'Parking privado', en: 'Private parking' },
    kitchen: { es: 'Cocina completa', en: 'Full kitchen' },
    'sea-view': { es: 'Vistas al mar', en: 'Sea view' },
    'city-view': { es: 'Vistas a la ciudad', en: 'City view' },
    garden: { es: 'Jardín privado', en: 'Private garden' },
    terrace: { es: 'Terraza', en: 'Terrace' },
    jacuzzi: { es: 'Jacuzzi', en: 'Jacuzzi' },
    gym: { es: 'Gimnasio', en: 'Gym' },
    cinema: { es: 'Home cinema', en: 'Home cinema' },
    bbq: { es: 'Barbacoa', en: 'BBQ' },
    fireplace: { es: 'Chimenea', en: 'Fireplace' },
    'beach-access': { es: 'Acceso privado a playa', en: 'Private beach access' },
    concierge: { es: 'Servicio concierge', en: 'Concierge service' },
    elevator: { es: 'Ascensor', en: 'Elevator' },
  };
  return labels[key]?.[locale] ?? key;
};

// Zone labels (legacy compat)
export const destinationLabel = (id: string, locale: 'es' | 'en') => {
  const known: Record<string, { es: string; en: string }> = {
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
  const k = known[id.toLowerCase()];
  if (k) return k[locale] ?? k.es;
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format price in EUR
export const formatPrice = (amount: number, locale: 'es' | 'en'): string => {
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
