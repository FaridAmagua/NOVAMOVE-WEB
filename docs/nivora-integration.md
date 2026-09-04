# Integración Nivora — Notas de implementación

## Estado

Rama: `feat/nivora-property-catalog` (sin merge a main, sin deploy)

## Contrato Nivora aplicado literal

### Endpoint
```
GET {NIVORA_API_URL}/v1/public/sites/{NIVORA_SITE_KEY}/properties

Headers:
  Authorization: Bearer {NIVORA_CATALOG_TOKEN}
  Accept:        application/json
```

### Tipos consumidos (del contrato)

```ts
type LocalizedPropertyContent = {
  title: string;
  tagline?: string;
  description: string;
  publicLocation: string;
};

type PublicProperty = {
  id: string;
  slug: string;
  reference: string;
  operation: 'rent' | 'sale';
  type: 'apartment' | 'house' | 'chalet' | 'duplex' | 'penthouse' | 'studio' | 'land' | 'commercial' | 'office' | 'garage' | 'other';
  status: 'available' | 'reserved';
  featured: boolean;
  content: { es: LocalizedPropertyContent; en?: LocalizedPropertyContent };
  pricing: { amountCents: number; currency: 'EUR'; period: 'month' | null };
  specs: { bedrooms: number | null; bathrooms: number | null; builtAreaSqm: number | null; usableAreaSqm: number | null; plotAreaSqm: number | null };
  features: { es: string[]; en?: string[] };
  images: Array<{ id: string; url: string; alt: { es: string; en?: string }; width: number | null; height: number | null; isCover: boolean; position: number; focalPoint?: { x: number; y: number } }>;
  publishedAt: string;
  updatedAt: string;
};

type PublicCatalogResponse = {
  schemaVersion: '1.0';
  site: string;
  generatedAt: string;
  properties: PublicProperty[];
};
```

### Validación

`fetchNivoraCatalog` valida en runtime:
- `schemaVersion === '1.0'` (falla con error explícito si no)
- `site` presente
- `generatedAt` presente
- `properties` es array
- Cada propiedad: `id` y `slug` presentes, `content.es` con `title/description/publicLocation`, `pricing.amountCents/currency === 'EUR'`, `operation` en `rent|sale`, `images` array

### Variables de entorno requeridas

```
NIVORA_API_URL       https://api-nivora.decotea.es
NIVORA_SITE_KEY      glovalmove
NIVORA_CATALOG_TOKEN replace-with-real-token
```

### Mapping Nivora → Property (UI)

| Nivora | Property |
|---|---|
| `content.es.title` | `name.es` |
| `content.en?.title` (fallback a es) | `name.en` |
| `content.es.tagline` | `tagline.es` |
| `content.en?.tagline` (fallback) | `tagline.en` |
| `content.es.description` | `description.es` |
| `content.en?.description` (fallback) | `description.en` |
| `content.es.publicLocation` | `destination` (y `location.es`) |
| `content.en?.publicLocation` (fallback) | `location.en` |
| `pricing.amountCents / 100` | `price` (€/mes) |
| `specs.bedrooms ?? 0` | `bedrooms` |
| `specs.bathrooms ?? 0` | `bathrooms` |
| `specs.builtAreaSqm ?? 0` | `sizeM2` |
| `features.es` (array) | `amenidades` |
| `features.en` (fallback a es) | — |
| `images` ordenadas con `isCover` primero | `images` (URLs) |
| `images[0].focalPoint` → `center {y}% center {x}%` | `imageFocal` |
| `featured` | `featured` |
| `operation` | `transaction` (rent | sale) |
| `type` (mapped a los 4 tipos que soporta la UI) | `type` |
| `content.es.publicLocation` | `destination` (zone libre) |

**No leemos** de Nivora: `publishedAt`, `updatedAt`, `reference`, `usableAreaSqm`, `plotAreaSqm`, `id` (slug), `id` (id), `width`, `height`, `alt`, `focalPoint` (excepto para la primera imagen). `maxGuests` se eliminó (no se infiere).

**Catálogo vacío** es válido: `properties: []` no rompe el build.
**Status** no se expone todavía en la UI (se guarda vía `featured` como proxy temporal).
**focalPoint** se convierte a CSS `object-position` (`"center {y}% center {x}%"`).

## Comportamientos garantizados

- **Producción**: consulta Nivora. Falla con error explícito si NivoraError (red, schemaVersion, o JSON inválido). Build roto.
- **Desarrollo** sin vars: fallback a fixture local (9 propiedades). Advertido con `console.warn`.
- **Catálogo vacío**: válido. `getProperties()` devuelve 0 propiedades sin error.
- **Cache**: memoización en memoria durante un mismo proceso de build. Sin disco.

## Archivos modificados

- `src/data/nivora-catalog.ts` — Cliente Nivora + tipos exactos + validación runtime
- `src/data/property-source.ts` — Mapper Nivora → Property (modelo UI)
- `.env.example` — Variables Nivora (sin NIVORA_ENDPOINT_OVERRIDE ni NIVORA_FORCE_REFRESH)

## Archivos no modificados (por restricción)

- `netlify/functions/create-payment.ts` — Redsys (legacy, aislado)
- `netlify/functions/redsys-notification.ts` — Redsys (legacy, aislado)
- `src/components/PaymentOverlay.astro` — Pago overlay (legacy, aislado)

## Tests verificados

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | Dev sin env vars → fallback | Source: fallback, 9 properties ✓ |
| 2 | Build con JSON del contrato (ES + EN, cover, focalPoint) | Source: nivora, 2 properties, mapping correcto ✓ |
| 3 | Catálogo vacío | Source: nivora, 0 properties, sin error ✓ |
| 4 | schemaVersion inválido | Error: "schemaVersion inválido: 'X' (esperado '1.0')" ✓ |

## Pendiente

1. **Credenciales reales de Nivora** en `.env` (desarrollo) y en Netlify dashboard (producción).
2. **Validar el schema** con el JSON real que devuelve Nivora (comparar contra el tipo `PublicCatalogResponse`).
3. **Si el JSON real tiene campos extra** que no están en el tipo, el adapter los ignora silenciosamente (no rompe). Si Nivora añade campos obligatorios nuevos, hay que actualizar el tipo.
4. **Una vez validado** en staging de Netlify → merge a main + deploy.
