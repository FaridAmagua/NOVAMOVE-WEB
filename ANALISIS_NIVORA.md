# Análisis — Integración catálogo Nivora

> **Rama**: `feat/nivora-property-catalog`
> **Web publicada**: https://globalmove.agency
> **Dominio real**: `globalmove.agency` (no `globalmove.com`)
> **Estado**: Solo análisis + propuesta. NO implementar hasta tener el contrato de la API de Nivora.

---

## 1. Archivos que habría que modificar

### Tier 1 · Datos (modelo + adaptador)

| Archivo | Acción | Por qué |
|---|---|---|
| `src/data/properties.ts` | **Reemplazar** (manteniendo fallback local) | Fuente actual de datos; será el fallback si Nivora falla |
| `src/data/nivora-catalog.ts` (nuevo) | **Crear** | Adaptador centralizado: tipos Nivora, fetch en build, normalización |
| `netlify/functions/fetch-nivora.ts` (nuevo) | **Crear** | Serverless function que llama a la API de Nivora en build (con cache) |

### Tier 2 · Consumidores

| Archivo | Acción | Por qué |
|---|---|---|
| `src/pages/[locale]/properties/index.astro` | Adaptar imports | Lista todas las propiedades |
| `src/pages/[locale]/properties/[slug].astro` | Adaptar imports + eliminar flujo de booking | Detalle de propiedad individual |
| `src/pages/[locale]/book/[slug].astro` | **Eliminar o reemplazar** | El proyecto pasa de "alquiler vacacional con booking online" a "alquiler de larga duración bajo solicitud" |
| `src/pages/[locale]/book/success.astro` | Mantener si se reusa como "Solicitud enviada" | Confirmación genérica |
| `src/pages/[locale]/book/cancelled.astro` | **Eliminar** | Sin pago online → sin cancelación |

### Tier 3 · SEO / Dominio

| Archivo | Acción | Por qué |
|---|---|---|
| `astro.config.mjs` | Cambiar `site: 'https://globalmove.com'` → `'https://globalmove.agency'` | URL canónica en todo el SEO |
| `src/layouts/BaseLayout.astro` | Sustituir todos los fallbacks `?? 'https://globalmove.com'` | Sin fallback a dominio incorrecto |
| `src/pages/index.astro` | Cambiar `href="/es/"` (este ya es relativo, sin acción) | OK |
| `public/og-image.jpg`, `public/favicon.png` | Revisar que no apunten al dominio viejo | URLs absolutas hardcoded |
| `src/components/Footer.astro` y `contact.astro` | `mailto:hello@globalmove.com` → revisar (¿cambia a `@globalmove.agency`?) | Email — depende de marketing |
| `src/i18n/{es,en}.json` | Cambiar `hello@globalmove.com` si aplica | i18n |

### Tier 4 · Componentes auxiliares (no urgentes, revisar después)

| Archivo | Acción | Por qué |
|---|---|---|
| `src/components/Logo.astro`, `Header.astro`, `Footer.astro`, `Lightbox.astro`, etc. | Nada (no consumen datos de propiedades directamente) | OK |
| `src/components/PaymentOverlay.astro` | **Eliminar o dejar muerto** (no se usará con Nivora) | Reservas online fuera de scope |
| `netlify/functions/create-payment.ts`, `redsys-notification.ts` | **Eliminar del deploy** (no se usan) | Sin pagos online |
| `scripts/generate-paypal-link.mjs` | Mantener (útil para reservas manuales futuras) | OK |

---

## 2. Modelo actual (lo que espera la web)

### Interfaz TypeScript actual en `src/data/properties.ts`

```ts
type PropertyType = 'villa' | 'apartment' | 'finca' | 'penthouse';
type TransactionType = 'rent' | 'sale';        // ⚠️ Nivora será SOLO rent (alquiler larga duración)
type DestinationId = 'madrid' | 'barcelona' | 'marbella' | 'mallorca' | 'ibiza' | 'canarias';

interface Property {
  id: string;
  slug: string;                                  // Nivora: id = slug
  type: PropertyType;
  transaction: TransactionType;
  destination: DestinationId;                    // Nivora: tag/zone libre
  name: { es: string; en: string };              // Nivora: título localizado
  tagline: { es: string; en: string };
  description: { es: string; en: string };
  location: { es: string; en: string };         // Nivora: dirección formateada por zona
  price: number;                                 // ⚠️ Nivora: priceMonthly (€/mes), no por noche
  cleaningFee?: number;                          // ⚠️ Nivora: NO aplica (larga estancia)
  minNights?: number;                            // ⚠️ Nivora: minMonths (mínimo de estancia)
  maxGuests: number;                             // ⚠️ Nivora: opcional o distinto
  bedrooms: number;                              // ✅ match
  bathrooms: number;                             // ✅ match
  sizeM2: number;                                // ✅ match
  amenities: string[];                           // Nivora: array de tags
  images: string[];                              // ✅ array URLs
  imageFocal?: string;                           // Nivora: opcional, default 62%
  reviews?: Review[];                             // ⚠️ NO incluir (sin reviews online)
  featured?: boolean;                             // ⚠️ Nivora: "destacado" o ranking
  lat?: number; lng?: number;                     // ⚠️ Nivora: opcional (privacidad)
}

interface Review {
  author, origin, date, rating, text: { es, en }
}
```

### Datos de los consumidores

**`properties/index.astro`** (listing) consume:
- `properties[]` (array)
- `p.transaction` (para filtrar rent/sale y decidir CTA + badge)
- `p.destination` (para filtro de zona)
- `p.imageFocal`, `p.featured`, `p.price`, `p.type`
- `t('properties.priceUnitRent')`, `t('properties.priceUnitSale')`, `t('properties.requestInfo')`, `t('properties.bookNow')`
- `destinationLabel(p.destination, locale)` (helper)

**`properties/[slug].astro`** (detalle) consume:
- `properties` (en `getStaticPaths`)
- `getPropertyBySlug(propertySlug)`
- `p.images`, `p.imageFocal`, `p.transaction`, `p.maxGuests`, `p.amenities`, `p.lat`, `p.lng`, `p.location`
- `amenityLabel(key, locale)`, `transactionLabel(t, locale)`, `destinationLabel(d, locale)`, `propertyTypeLabel(t, locale)`
- `p.name`, `p.tagline`, `p.description`, `p.location`, `p.sizeM2`, `p.bedrooms`, `p.bathrooms`
- `p.reviews` (sección testimonios)
- **Lógica de booking**: `if (!isSale && property.minNights)` (mostrar datepicker para reservas)

**`book/[slug].astro`** (booking) consume:
- `properties.filter(prop => prop.transaction === 'rent')` (en `getStaticPaths`)
- `getPropertyBySlug(slug)`
- `property.price`, `property.cleaningFee`, `property.minNights`, `property.maxGuests`
- Lógica completa de booking online con datepicker, cálculo de precio, Redsys

**`book/success.astro`** y **`book/cancelled.astro`** consumen:
- `getPropertyBySlug(slug)` (para link "Ver la propiedad")

---

## 3. Modelo que Nivora necesitará exponer (propuesta)

### Interfaz Nivora → NOVAMOVE-WEB (orientativa, pendiente de contrato)

```ts
interface NivoraProperty {
  id: string;                                  // slug canónico de Nivora
  // Localización (i18n)
  title: Record<Locale, string>;                // "Villa Mediterránea" / "Mediterranean Villa"
  tagline?: Record<Locale, string>;
  description: Record<Locale, string>;
  location: {
    zone: string;                              // zona pública (ej: "Marbella East")
    address: Record<Locale, string>;           // dirección formateada por idioma
  };
  // Specs
  type: 'villa' | 'apartment' | 'finca' | 'penthouse' | 'townhouse' | 'duplex';
  bedrooms: number;
  bathrooms: number;
  sizeM2: number;
  // Pricing & estancia (LARGA duración)
  priceMonthly: number;                        // €/mes
  minMonths?: number;                          // mínimo de estancia (ej: 3 meses)
  // Disponibilidad
  status: 'available' | 'reserved' | 'unavailable';
  availableFrom?: string;                       // ISO date
  // Media
  images: string[];                             // URLs absolutas
  primaryImageFocal?: string;                   // '62%' por defecto
  // Características (tags libres en lugar de enum fijo)
  amenities: string[];                          // ej: ['pool', 'sea-view', 'parking']
  // Geo (opcional)
  lat?: number;
  lng?: number;
  // Featured
  featured?: boolean;
}

interface NivoraCatalogResponse {
  properties: NivoraProperty[];
  generatedAt: string;                           // ISO timestamp
  // Posibles metadatos de paginación, total count, version, etc.
}
```

### Modelo intermedio (en NOVAMOVE-WEB)

Mantengo `Property` actual como **modelo de UI canónico**, añado un mapper desde `NivoraProperty → Property`:

```ts
// src/data/nivora-catalog.ts
import type { Property } from './properties';

export interface NivoraProperty { /* ... la misma del apartado 3 ... */ }

export function fromNivora(np: NivoraProperty): Property {
  return {
    id: np.id,
    slug: np.id,
    type: np.type,
    transaction: 'rent',           // Nivora = solo alquiler
    destination: 'marbella',        // ⚠️ decidir: ¿mapeo a zone o usar zone libre?
    name: np.title,
    tagline: np.tagline ?? { es: '', en: '' },
    description: np.description,
    location: np.location.address,
    price: np.priceMonthly,
    bedrooms: np.bedrooms,
    bathrooms: np.bathrooms,
    sizeM2: np.sizeM2,
    amenities: np.amenities,
    images: np.images,
    imageFocal: np.primaryImageFocal ?? '62%',
    // Sin reviews, sin cleaningFee, sin minNights → larga estancia
    featured: np.featured,
    lat: np.lat,
    lng: np.lng,
  };
}
```

### ⚠️ Punto a aclarar con Nivora

El campo `destination` actual es enum cerrado (`'madrid' | 'barcelona' | ...`). Si Nivora devuelve zonas libres (strings), necesito:
- **Opción A**: mantener el enum y mapear zone string → enum (con fallback 'marbella' o 'otros')
- **Opción B**: cambiar `destination` a `string` libre y eliminar `destinationLabel` (mostrar zone crudo en UI)

Mi recomendación: **Opción B** porque da más flexibilidad para futuras zonas y simplifica.

---

## 4. Propuesta del adaptador (sin implementar)

### Estructura

```
src/data/
├── properties.ts          ← Modelo UI canónico (Property interface + fallback local)
├── nivora-catalog.ts      ← Tipos Nivora + mapper NivoraProperty → Property
└── property-source.ts     ← Interfaz + factory que decide el origen (Nivora vs fallback)
```

### `property-source.ts` (interfaz)

```ts
import type { Property } from './properties';
import { properties as fallbackProperties } from './properties';
// import { fetchNivoraCatalog } from './nivora-catalog';  // cuando llegue el contrato

export interface PropertySource {
  name: 'nivora' | 'fallback';
  fetch(): Promise<Property[]>;
  refresh?(): Promise<void>;
}

export async function getProperties(): Promise<{ source: PropertySource; properties: Property[] }> {
  try {
    // 1. Intentar Nivora
    // const nivoraProps = await fetchNivoraCatalog();
    // return { source: { name: 'nivora' }, properties: nivoraProps };
  } catch (err) {
    console.warn('[properties] Nivora unavailable, using fallback:', err);
  }
  // 2. Fallback al catálogo local (desarrollo / degradado)
  return { source: { name: 'fallback' }, properties: fallbackProperties };
}
```

### Serverless function (en build de Netlify)

```ts
// netlify/functions/fetch-nivora.ts
import type { Handler } from '@netlify/functions';
import { NivoraProperty, fromNivora } from '../../src/data/nivora-catalog';

export const handler: Handler = async () => {
  const API_URL = process.env.NIVORA_API_URL;
  const API_KEY = process.env.NIVORA_API_KEY;
  // Cache en disco /tmp para builds repetidos
  const res = await fetch(`${API_URL}/v1/properties`, { headers: { Authorization: `Bearer ${API_KEY}` }});
  const data = await res.json() as { properties: NivoraProperty[] };
  const properties = data.properties.map(fromNivora);
  return { statusCode: 200, body: JSON.stringify({ properties, generatedAt: new Date().toISOString() }) };
};
```

### Cómo lo consumen las páginas

```ts
// src/pages/[locale]/properties/index.astro
import { getProperties } from '../../data/property-source';

const { properties } = await getProperties();
// ... resto igual
```

```ts
// src/pages/[locale]/properties/[slug].astro
import { getProperties } from '../../../data/property-source';

const { properties } = await getProperties();
export async function getStaticPaths() {
  const paths = [];
  for (const locale of supportedLocales) {
    for (const p of properties) {
      paths.push({ params: { locale, slug: p.slug }, props: { property: p } });
    }
  }
  return paths;
}
```

### Estrategia de build

- **Build time** (Astro SSG): la función `getProperties()` se llama una sola vez al hacer `astro build`. El resultado se cachea en disco (`netlify/functions/.cache/nivora.json`).
- **Runtime** (Netlify CDN): las páginas son estáticas. Si Nivora falla en el build → fallback automático al catálogo local.
- **Rebuild** automático cuando Nivora publica cambios (Netlify build hook).

---

## 5. Plan de implementación (en orden)

| # | Tarea | Bloqueante | Estimación |
|---|-------|------------|-------------|
| 1 | Recibir contrato de API de Nivora | ✅ Sí | — |
| 2 | Definir `NivoraProperty` exacto según contrato | Sí (1) | 30 min |
| 3 | Crear `src/data/nivora-catalog.ts` (tipos + mapper) | Sí (2) | 1 h |
| 4 | Crear `netlify/functions/fetch-nivora.ts` con cache | Sí (2) | 1 h |
| 5 | Crear `src/data/property-source.ts` (factory + fallback) | Sí (3, 4) | 30 min |
| 6 | Cambiar imports en `properties/index.astro` y `properties/[slug].astro` | Sí (5) | 30 min |
| 7 | Eliminar/adaptar `book/[slug].astro` → quitar datepicker, dejar mensaje "solicita información" | No | 1 h |
| 8 | Eliminar `book/cancelled.astro` y `netlify/functions/{create-payment,redsys-notification}.ts` | No | 30 min |
| 9 | Cambiar `astro.config.mjs` site → `globalmove.agency` | No | 5 min |
| 10 | Cambiar todos los `?? 'https://globalmove.com'` en `BaseLayout.astro` | Sí (9) | 10 min |
| 11 | Reemplazar CTA "Reservar ahora" → "Solicitar información" en `properties/[slug].astro` | No | 30 min |
| 12 | Probar build local + verificar todas las páginas | No | 30 min |
| 13 | Documentar `docs/nivora-integration.md` con setup de env vars | Sí (4) | 30 min |
| 14 | Commit en `feat/nivora-property-catalog` (NO merge a main) | No | 5 min |

**Estimación total**: ~1 día de trabajo, una vez recibido el contrato.

---

## 6. Riesgos e incompatibilidades

### 🔴 Críticos

1. **Contrato de Nivora no definido todavía** → bloqueante. No puedo empezar el adapter real sin esto.
2. **`reviews` se va** → la sección de testimonios en property detail queda huérfana. Decidir: ¿quitar la sección entera o dejar fallback con "Próximamente" si Nivora devuelve reviews?
3. **`transaction: 'sale'` se elimina** → todas las propiedades de Nivora son alquiler. Hay que:
   - Quitar el filtro "Venta" en `properties/index.astro`
   - Quitar las 3 propiedades de venta de fallback (palacete Madrid, ático Barcelona, mansión Marbella)
   - Quitar `priceUnitSale`, `saleBadge`, `requestInfo` (vs `bookNow`) del i18n
4. **`cleaningFee` desaparece** (larga estancia suele incluir limpieza en el alquiler mensual).
5. **`minNights` desaparece** → cambia a `minMonths` o simplemente "Estancia mínima: X meses".
6. **`maxGuests` puede no existir** en Nivora (alquiler de larga duración no suele limitar huéspedes).

### 🟡 Moderados

7. **Zona libre vs enum cerrado** — necesito respuesta de Nivora: ¿viene `zone` como string libre?
8. **Localización (i18n)** — Nivora debería devolver campos localizados. ¿O devuelve solo ES/EN? ¿O solo un idioma y nosotros traducimos?
9. **Imágenes** — ¿Nivora devuelve URLs absolutas o paths relativos? Si son paths, ¿con qué base URL?
10. **`featured`** — ¿Nivora tiene un campo "destacado" o un ranking interno?
11. **`priceMonthly`** — ¿en EUR o moneda local? Si es local, necesito tipo de cambio.
12. **Disponibilidad** — si Nivora devuelve `status`, ¿el flujo de "Solicitar información" debe filtrar las `unavailable`?

### 🟢 Menores

13. **`imageFocal`** — Nivora puede no traerlo. Default 62% sigue funcionando.
14. **Lat/Lng** — opcional. Si Nivora no lo da, el mapa de la propiedad queda sin pinpoint pero sigue funcionando.
15. **TypeScript errors actuales** — al cambiar la fuente de datos, el tipado puede quedar inconsistente. Necesitaré limpiar tras la migración.

---

## 7. Errores TypeScript actuales detectados

Sin hacer refactor masivo, los que veo en el modelo actual son:

| Archivo | Línea | Error potencial |
|---|---|---|
| `src/data/properties.ts` | 67 | `Property` interface con `reviews?: Review[]` que se va — el tipo se mantiene para fallback |
| `src/data/properties.ts` | 419-421 | `getPropertyBySlug` es genérico — necesita retornar `Property \| undefined` |
| `src/data/properties.ts` | 425-435 | `destinationLabel` usa enum cerrado — incompatible con zone libre de Nivora |
| `src/data/properties.ts` | 437-457 | `amenityLabel` tiene un dict hardcoded — puede haber amenities nuevas en Nivora no contempladas |
| `src/pages/[locale]/book/[slug].astro` | (varios) | Usa `property.minNights` que se va con Nivora |
| `src/pages/[locale]/properties/index.astro` | 115-117 | Filtros `transaction` con 'rent'/'sale' — quitar 'sale' |
| `src/pages/[locale]/properties/[slug].astro` | (varios) | Sección `prop-reviews` queda huérfana sin reviews |

> **No los arreglo todavía** — espero al merge final con datos reales de Nivora.

---

## 8. Cambios de dominio pendientes (`globalmove.com` → `globalmove.agency`)

| Línea | Archivo | Cambio |
|---|---|---|
| 7 | `astro.config.mjs` | `site: 'https://globalmove.com'` → `site: 'https://globalmove.agency'` |
| 43 | `src/layouts/BaseLayout.astro` | `Astro.site ?? 'https://globalmove.com'` → `Astro.site ?? 'https://globalmove.agency'` |
| 46 | `src/layouts/BaseLayout.astro` | Idem |
| 67 | `src/layouts/BaseLayout.astro` | Idem (og:image) |
| 77 | `src/layouts/BaseLayout.astro` | Idem (twitter:image) |
| 38 | `src/components/Footer.astro` | `mailto:hello@globalmove.com` → revisar si cambia |
| 69 | `src/pages/[locale]/contact.astro` | Idem |
| 126 (es) | `src/i18n/es.json` | `contact.info.email` |
| 126 (en) | `src/i18n/en.json` | Idem |
| 370 (es) | `src/i18n/es.json` | `bookingCancelled.help` |
| 370 (en) | `src/i18n/en.json` | Idem |
| 13 | `src/pages/index.astro` | `href="/es/"` (este ya es relativo, OK) |

---

## 9. Pendiente de tu input

Para desbloquear la implementación:

1. 📋 **Contrato exacto de la API de Nivora** (URL base, auth, endpoints, schema JSON)
2. ❓ **Decisión**: ¿el email de contacto cambia a `hello@globalmove.agency`?
3. ❓ **Decisión**: ¿la zona (zone) viene como string libre o como enum controlado?
4. ❓ **Decisión**: ¿Nivora devuelve campos localizados (ES/EN) o solo ES y nosotros traducimos?
5. ❓ **Decisión**: para los testimonios (reviews) — ¿Nivora los tiene? Si no, ¿qué hago en la UI?

Una vez me confirmes estos 5 puntos, arrancamos con el plan de implementación.
