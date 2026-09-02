// src/data/properties.ts
// Modelo UI canónico + fixture para DESARROLLO.
//
// En PRODUCCIÓN el catálogo lo sirve Nivora (ver property-source.ts).
// Este archivo solo se usa como fallback de desarrollo y como fuente del tipo
// `Property` que el resto de la web consume.
//
// Transacciones:
//   - 'rent': alquiler (Nivora = solo larga duración ahora)
//   - 'sale': venta (legacy, no se usa en producción pero se mantiene el tipo)

export type PropertyType = 'villa' | 'apartment' | 'finca' | 'penthouse';
export type TransactionType = 'rent' | 'sale';
/** Zona pública libre (Nivora). Mantener como tipo `string` para no limitar
 *  futuras zonas — usar `zoneLabel(zone, locale)` desde property-source.ts
 *  para mostrar un nombre legible. */
export type DestinationId = string;

export interface Property {
  id: string;
  slug: string;
  type: PropertyType;
  transaction: TransactionType;
  destination: DestinationId;
  name: { es: string; en: string };
  tagline: { es: string; en: string };
  description: { es: string; en: string };
  location: { es: string; en: string };
  /** Per-night (rent) OR total sale price (sale), in EUR. */
  price: number;
  /** Only relevant for rentals: nightly cleaning fee in EUR. */
  cleaningFee?: number;
  /** Minimum stay for rentals in nights. */
  minNights?: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  sizeM2: number;
  amenities: string[];
  images: string[];
  /** Per-property focal point for the gallery main image. Expressed as % from top. */
  imageFocal?: string;
  /** Reviews — actualmente sin uso en producción (Nivora no envía reviews en el
   *  contrato inicial). Mantenido en el tipo para futuro uso. La UI debe ocultar
   *  la sección de testimonios si `reviews` es undefined o está vacío. */
  reviews?: Review[];
  featured?: boolean;
  lat?: number;
  lng?: number;
}

/** Default focal point for property images (skip sky, keep building centred). */
export const DEFAULT_IMAGE_FOCAL = '62%';

export interface Review {
  author: { es: string; en: string };
  origin: { es: string; en: string };
  date: string;
  rating: number;
  text: { es: string; en: string };
}

export const properties: Property[] = [
  {
    id: 'villa-mediterranea-marbella',
    slug: 'villa-mediterranea-marbella',
    type: 'villa',
    transaction: 'rent',
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
    cleaningFee: 350,
    minNights: 5,
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 5,
    sizeM2: 620,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'garden', 'gym', 'concierge'],
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1600&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
    ],
    featured: true,
    lat: 36.5097,
    lng: -4.8862,
    imageFocal: '62%',
    reviews: [
      {
        author: { es: 'Familia Schmidt', en: 'The Schmidt family' },
        origin: { es: 'Múnich, Alemania', en: 'Munich, Germany' },
        date: '2026-03-12',
        rating: 5,
        text: {
          es: 'La villa superó todas nuestras expectativas. El concierge nos recibió personalmente, la cocina perfectamente equipada y la piscina infinity con vistas al mar es indescriptible. Volveremos el próximo verano sin duda.',
          en: 'The villa exceeded all our expectations. The concierge welcomed us personally, the kitchen was perfectly equipped and the infinity pool with sea views is indescribable. We will return next summer for sure.',
        },
      },
      {
        author: { es: 'Anders B.', en: 'Anders B.' },
        origin: { es: 'Oslo, Noruega', en: 'Oslo, Norway' },
        date: '2025-10-04',
        rating: 5,
        text: {
          es: 'Reservé para una semana de trabajo remoto. Internet impecable, entorno tranquilo y a 5 minutos de Puerto Banús. La atención de Global Move durante toda la estancia fue excepcional.',
          en: 'I booked for a week of remote work. Impeccable internet, quiet surroundings and 5 minutes from Puerto Banús. Global Move\'s attention throughout the stay was exceptional.',
        },
      },
    ],
  },
  {
    id: 'casa-blaca-ibiza',
    slug: 'casa-blaca-ibiza',
    type: 'villa',
    transaction: 'rent',
    destination: 'ibiza',
    name: { es: 'Casa Blanca Ibiza', en: 'Casa Blanca Ibiza' },
    tagline: {
      es: 'Finca ibicenca tradicional con vistas a Es Vedrà',
      en: 'Traditional Ibizan finca with views of Es Vedrà',
    },
    description: {
      es: 'Auténtica finca ibicenca rehabilitada con respeto por la arquitectura tradicional. Paredes encaladas, techos de sabina, infinity pool con vistas mágicas al islote de Es Vedrà al atardecer. Cinco hectáreas de privacidad absoluta.',
      en: 'Authentic Ibizan finca lovingly restored with respect for traditional architecture. Whitewashed walls, sabina wood ceilings, infinity pool with magical views of Es Vedrà at sunset. Five hectares of absolute privacy.',
    },
    location: { es: 'San José, Ibiza', en: 'San José, Ibiza' },
    price: 2400,
    cleaningFee: 450,
    minNights: 7,
    maxGuests: 12,
    bedrooms: 6,
    bathrooms: 5,
    sizeM2: 580,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'garden', 'concierge', 'bbq'],
    images: [
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80',
      'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1600&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80',
    ],
    featured: true,
    lat: 38.9067,
    lng: 1.2906,
    imageFocal: '70%',
    reviews: [
      {
        author: { es: 'Léa M.', en: 'Léa M.' },
        origin: { es: 'París, Francia', en: 'Paris, France' },
        date: '2026-05-22',
        rating: 5,
        text: {
          es: 'Casa Blanca es magia pura. Los atardeceres sobre Es Vedrà desde la infinity pool son irrepetibles. Cada detalle de la finca está cuidado con mimo, se nota que fue una casa familiar durante generaciones.',
          en: 'Casa Blanca is pure magic. The sunsets over Es Vedrà from the infinity pool are unrepeatable. Every detail of the estate is lovingly cared for, you can tell it was a family home for generations.',
        },
      },
      {
        author: { es: 'Tom & Sara', en: 'Tom & Sara' },
        origin: { es: 'Londres, Reino Unido', en: 'London, UK' },
        date: '2025-09-18',
        rating: 5,
        text: {
          es: 'Hicimos nuestra boda aquí y fue el lugar perfecto. La finca tiene una energía especial, el equipo de Global Move coordinó cada detalle con proveedores locales de primer nivel.',
          en: 'We had our wedding here and it was the perfect venue. The estate has a special energy, the Global Move team coordinated every detail with top-tier local vendors.',
        },
      },
    ],
  },
  {
    id: 'penthouse-puerto-banus',
    slug: 'penthouse-puerto-banus',
    type: 'penthouse',
    transaction: 'rent',
    destination: 'marbella',
    name: { es: 'Penthouse Puerto Banús', en: 'Puerto Banús Penthouse' },
    tagline: {
      es: 'Ático de diseño con vistas al mar y al puerto',
      en: 'Designer penthouse overlooking the sea and marina',
    },
    description: {
      es: 'Ático de diseño contemporáneo a 50 metros de la playa. Terraza wrap-around de 120 m² con jacuzzi, vistas frontales al mar Mediterráneo y al emblemático Puerto Banús. Totalmente amueblado por interiorista.',
      en: 'Contemporary designer penthouse 50 metres from the beach. 120 m² wrap-around terrace with jacuzzi, frontal views of the Mediterranean and the iconic Puerto Banús marina. Fully furnished by an interior designer.',
    },
    location: { es: 'Puerto Banús, Marbella', en: 'Puerto Banús, Marbella' },
    price: 1250,
    cleaningFee: 250,
    minNights: 4,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    sizeM2: 340,
    amenities: ['wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'terrace', 'jacuzzi', 'concierge'],
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1600&q=80',
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=80',
    ],
    lat: 36.4853,
    lng: -4.9521,
    imageFocal: '65%',
  },
  {
    id: 'finca-mallorca-pollenca',
    slug: 'finca-mallorca-pollenca',
    type: 'finca',
    transaction: 'rent',
    destination: 'mallorca',
    name: { es: 'Finca Pollensa', en: 'Pollensa Estate' },
    tagline: {
      es: 'Finca centenaria con olivos y piscina privada',
      en: 'Centenary estate with olive grove and private pool',
    },
    description: {
      es: 'Encantadora finca del siglo XIX rodeada de 8 hectáreas de olivos centenarios. Piscina privada, bodega tradicional, gimnasio y un jardín botánico privado. A 10 minutos de las playas del norte de Mallorca.',
      en: 'Charming 19th-century finca surrounded by 8 hectares of centenary olive trees. Private pool, traditional cellar, gym and a private botanical garden. Ten minutes from northern Mallorca\'s beaches.',
    },
    location: { es: 'Pollensa, Mallorca', en: 'Pollensa, Mallorca' },
    price: 1450,
    cleaningFee: 300,
    minNights: 5,
    maxGuests: 14,
    bedrooms: 7,
    bathrooms: 6,
    sizeM2: 720,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'garden', 'gym', 'concierge', 'bbq', 'fireplace'],
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80',
      'https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=1600&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1600&q=80',
    ],
    lat: 39.8763,
    lng: 3.0163,
    imageFocal: '60%',
  },
  {
    id: 'villa-blanca-ibiza',
    slug: 'villa-blanca-ibiza',
    type: 'villa',
    transaction: 'rent',
    destination: 'ibiza',
    name: { es: 'Villa Blanca', en: 'Villa Blanca' },
    tagline: {
      es: 'Diseño minimalista cerca de Cala Salada',
      en: 'Minimalist design near Cala Salada',
    },
    description: {
      es: 'Villa de líneas puras en la zona más codiciada de Ibiza. Interior minimalista firmado por un estudio holandés, infinity pool, home cinema y jardín con especies mediterráneas. A 3 minutos de Cala Salada.',
      en: 'Villa of clean lines in Ibiza\'s most coveted area. Minimalist interiors by a Dutch studio, infinity pool, home cinema and a Mediterranean-species garden. Three minutes from Cala Salada.',
    },
    location: { es: 'Sant Antoni, Ibiza', en: 'Sant Antoni, Ibiza' },
    price: 1980,
    cleaningFee: 380,
    minNights: 5,
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 4,
    sizeM2: 510,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'garden', 'gym', 'cinema', 'concierge'],
    images: [
      'https://images.unsplash.com/photo-1613553497126-a44624272024?w=1600&q=80',
      'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1600&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80',
    ],
    lat: 38.9810,
    lng: 1.3010,
    imageFocal: '65%',
  },
  {
    id: 'casa-atlantico-tenerife',
    slug: 'casa-atlantico-tenerife',
    type: 'villa',
    transaction: 'rent',
    destination: 'canarias',
    name: { es: 'Casa Atlántico', en: 'Atlantic House' },
    tagline: {
      es: 'Villa volcánica con vistas al Teide y al océano',
      en: 'Volcanic villa with views of Mount Teide and the ocean',
    },
    description: {
      es: 'Arquitectura volcánica contemporánea en la costa de Tenerife. Vistas simultáneas al Teide y al océano Atlántico, piscina desbordante climatizada con energía geotérmica, huerto orgánico y acceso privado a una cala escondida.',
      en: 'Contemporary volcanic architecture on the Tenerife coast. Simultaneous views of Mount Teide and the Atlantic Ocean, geothermal-heated overflow pool, organic vegetable garden and private access to a hidden cove.',
    },
    location: { es: 'Costa Adeje, Tenerife', en: 'Costa Adeje, Tenerife' },
    price: 1680,
    cleaningFee: 320,
    minNights: 5,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 4,
    sizeM2: 480,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'garden', 'concierge', 'beach-access'],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=1600&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80',
    ],
    lat: 28.0827,
    lng: -16.7335,
    imageFocal: '60%',
  },
  // ============ SALE PROPERTIES ============
  {
    id: 'palacete-madrid-salamanca',
    slug: 'palacete-madrid-salamanca',
    type: 'apartment',
    transaction: 'sale',
    destination: 'madrid',
    name: { es: 'Palacete Barrio de Salamanca', en: 'Salamanca District Palace' },
    tagline: {
      es: 'Apartamento de lujo en un palacio histórico reformado',
      en: 'Luxury apartment in a restored historic palace',
    },
    description: {
      es: 'Espectacular residencia de 380 m² en un palacio del siglo XIX totalmente rehabilitado. techos de 4 metros, molduras originales, tres balcones a la calle Serrano y dos plazas de parking. Una propiedad única en el corazón del Barrio de Salamanca.',
      en: 'Spectacular 380 m² residence in a fully restored 19th-century palace. 4-metre ceilings, original mouldings, three balconies facing Calle Serrano and two parking spaces. A unique property in the heart of Salamanca.',
    },
    location: { es: 'Barrio de Salamanca, Madrid', en: 'Salamanca, Madrid' },
    price: 4250000,
    maxGuests: 6,
    bedrooms: 4,
    bathrooms: 4,
    sizeM2: 380,
    amenities: ['wifi', 'ac', 'parking', 'kitchen', 'city-view', 'terrace', 'concierge', 'elevator', 'fireplace'],
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=80',
    ],
    featured: true,
    lat: 40.4290,
    lng: -3.6856,
    imageFocal: '50%',
    reviews: [
      {
        author: { es: 'Familia Petrov', en: 'The Petrov family' },
        origin: { es: 'Moscú, Rusia', en: 'Moscow, Russia' },
        date: '2026-01-15',
        rating: 5,
        text: {
          es: 'Nos ayudaron a adquirir este palaceto como residentes no UE. Toda la parte legal, fiscal y de NIE impecable. La propiedad es aún mejor en persona que en las fotos.',
          en: 'They helped us acquire this palace as non-EU residents. All legal, tax and NIE parts impeccable. The property is even better in person than in the photos.',
        },
      },
    ],
  },
  {
    id: 'atico-barcelona-eixample',
    slug: 'atico-barcelona-eixample',
    type: 'penthouse',
    transaction: 'sale',
    destination: 'barcelona',
    name: { es: 'Ático Eixample', en: 'Eixample Penthouse' },
    tagline: {
      es: 'Ático modernista con terraza panorámica',
      en: 'Modernista penthouse with panoramic terrace',
    },
    description: {
      es: 'Ático de 240 m² en finca modernista del Eixample. Terraza de 80 m² con vistas 360° sobre la Sagrada Familia y el Tibidabo. Totalmente reformado con materiales premium y domótica integral.',
      en: '240 m² penthouse in a Modernista building in the Eixample. 80 m² terrace with 360° views of the Sagrada Familia and Tibidabo. Fully renovated with premium materials and integrated home automation.',
    },
    location: { es: 'Eixample, Barcelona', en: 'Eixample, Barcelona' },
    price: 2890000,
    maxGuests: 4,
    bedrooms: 3,
    bathrooms: 2,
    sizeM2: 240,
    amenities: ['wifi', 'ac', 'parking', 'kitchen', 'city-view', 'terrace', 'elevator'],
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1600&q=80',
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=80',
    ],
    featured: true,
    lat: 41.3948,
    lng: 2.1619,
  },
  {
    id: 'mansion-marbella-venta',
    slug: 'mansion-marbella-venta',
    type: 'villa',
    transaction: 'sale',
    destination: 'marbella',
    name: { es: 'Mansion La Zagaleta', en: 'La Zagaleta Mansion' },
    tagline: {
      es: 'Mansión de lujo en la comunidad más exclusiva de Marbella',
      en: 'Luxury mansion in Marbella\'s most exclusive community',
    },
    description: {
      es: 'Mansión de 1.200 m² en la urbanización más exclusiva de Marbella. Parcela de 8.000 m² con vistas panorámicas al mar, piscina privada, spa, cine, gimnasio y seguridad 24h. Una propiedad irrepetible en el mercado.',
      en: '1,200 m² mansion in Marbella\'s most exclusive gated community. 8,000 m² plot with panoramic sea views, private pool, spa, cinema, gym and 24h security. An unrepeatable property on the market.',
    },
    location: { es: 'La Zagaleta, Marbella', en: 'La Zagaleta, Marbella' },
    price: 12500000,
    maxGuests: 12,
    bedrooms: 8,
    bathrooms: 9,
    sizeM2: 1200,
    amenities: ['pool', 'wifi', 'ac', 'parking', 'kitchen', 'sea-view', 'garden', 'gym', 'cinema', 'concierge', 'bbq'],
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
    ],
    featured: true,
    lat: 36.5300,
    lng: -4.9700,
    imageFocal: '65%',
    reviews: [
      {
        author: { es: 'Hassan A.', en: 'Hassan A.' },
        origin: { es: 'Dubái, EAU', en: 'Dubai, UAE' },
        date: '2026-02-08',
        rating: 5,
        text: {
          es: 'Compramos esta propiedad a través de Global Move. Due diligence impecable, negociación transparente y acompañamiento completo hasta la firma notarial. Un equipo de confianza absoluta.',
          en: 'We bought this property through Global Move. Impeccable due diligence, transparent negotiation and complete support through to notary signing. A team of absolute trust.',
        },
      },
    ],
  },
];

// Convenience: get a property by slug (legacy; prefiere getPropertyBySlug de
// property-source.ts para datos en vivo de Nivora)
export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find(p => p.slug === slug);
}

/**
 * Label legible para una zona pública libre.
 * Para zonas conocidas usamos el nombre localizado. Para zonas libres
 * prettificamos el slug (kebab-case → Title Case).
 *
 * Esta función se mantiene por compatibilidad con código existente, pero
 * la fuente de verdad para zonas dinámicas es `zoneLabel()` en
 * `property-source.ts`.
 */
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
  // Fallback: prettify slug
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Amenity labels
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

// Property type label
export const propertyTypeLabel = (type: PropertyType, locale: 'es' | 'en') => {
  const labels: Record<PropertyType, { es: string; en: string }> = {
    villa: { es: 'Villa', en: 'Villa' },
    apartment: { es: 'Apartamento', en: 'Apartment' },
    finca: { es: 'Finca', en: 'Finca' },
    penthouse: { es: 'Ático', en: 'Penthouse' },
  };
  return labels[type][locale];
};

// Transaction type label
export const transactionLabel = (t: TransactionType, locale: 'es' | 'en') => {
  return t === 'rent'
    ? (locale === 'es' ? 'Alquiler' : 'For rent')
    : (locale === 'es' ? 'Venta' : 'For sale');
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

export const calculateNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
};