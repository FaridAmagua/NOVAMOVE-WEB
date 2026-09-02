# Integración Nivora — Notas de implementación

## Estado

Rama: `feat/nivora-property-catalog` (sin merge a main, sin deploy)

## Archivos creados

- `src/data/nivora-catalog.ts` — Cliente Nivora (fetch directo en build + cache 1h)
- `src/data/property-source.ts` — Factory único (Nivora en prod, fixture en dev)
- `docs/nivora-integration.md` — Este archivo

## Archivos modificados

- `src/data/properties.ts` — `DestinationId` ahora es `string` (zona libre, no enum)
- `src/pages/[locale]/properties/index.astro` — Usa `getProperties()` + `zoneLabel()`
- `src/pages/[locale]/properties/[slug].astro` — Usa `getPropertyBySlug()` + reviews condicionadas
- `src/pages/[locale]/book/[slug].astro` — "Solicitar información" (sin booking online)
- `src/layouts/BaseLayout.astro` — `globalmove.com` → `globalmove.agency`
- `astro.config.mjs` — `site: 'https://globalmove.agency'`
- `.env.example` — Variables Nivora documentadas
- `.gitignore` — `.nivora-cache/` añadido

## Archivos NO modificados (por restricción del usuario)

- `netlify/functions/create-payment.ts` — Redsys (legacy, aislado)
- `netlify/functions/redsys-notification.ts` — Redsys (legacy, aislado)
- `src/components/PaymentOverlay.astro` — Overlay de pago (legacy, aislado)
- `src/pages/[locale]/book/success.astro` — (no linkeado desde el nuevo flow)
- `src/pages/[locale]/book/cancelled.astro` — (no linkeado)

## Variables de entorno requeridas en Netlify

```
NIVORA_API_URL       https://api.nivora.com
NIVORA_SITE_KEY      <obtenida del dashboard de Nivora>
NIVORA_CATALOG_TOKEN <obtenida del dashboard de Nivora>
```

Opcionales:
- `NIVORA_ENDPOINT_OVERRIDE` — override del endpoint
- `NIVORA_FORCE_REFRESH=1` — forzar re-fetch en cada build (ignora cache)

## Asunciones sobre el contrato de Nivora

⚠️ El esquema del JSON es una ASUNCIÓN. Ajustar cuando llegue el contrato real:

- Endpoint: `GET {NIVORA_API_URL}/v1/properties`
- Auth: `Authorization: Bearer {NIVORA_CATALOG_TOKEN}` + header `X-Site-Key`
- Localización: Nivora devuelve `title.es` (siempre) y `title.en` (opcional). Fallback a ES.
- Reviews: **NO incluidas** en el contrato inicial. La UI las oculta si no hay.
- Zona (`location.zone`): string libre, sin enum cerrado
- Precio: `priceMonthly` en EUR (€/mes)
- Tipos: villa, apartment, finca, penthouse, townhouse, duplex, studio, loft (string libre también)
- Estancia: `minMonths` opcional. Sin `cleaningFee` (larga duración lo incluye en el mensual)

## Pendiente del usuario

1. **Reemplazar valores placeholder en `.env.example`** con credenciales reales de Nivora
2. **Configurar env vars en Netlify dashboard** con los valores reales
3. **Validar el esquema JSON real** contra el código y ajustar tipos en `nivora-catalog.ts`
4. **Probar build** en Netlify (debería pasar con credenciales reales)

## Errores TypeScript pre-existentes

Detectados con `npx astro check` — **NO introducidos por esta integración**:

- 97 errores totales
- 0 warnings nuevos
- 21 hints

Los errores vienen principalmente de:
- `src/components/Lightbox.astro` y archivos con `data-astro-cid` — código de scrolling deprecado por Astro 4
- `src/data/properties.ts` (líneas con tipos faltantes o implícitos)
- `src/scripts/enhance.ts` — eventos DOM no tipados correctamente

⚠️ **No los arreglo en este PR** — el usuario pidió explícitamente no hacer refactor general.

## Tests locales

- **Dev** (`astro dev`): usa el fixture local, no requiere Nivora.
- **Build** (`astro build`): requiere credenciales Nivora reales o fallará con error explícito.
- **Verificar antes de mergear a main**:
  1. Crear rama temporal `feat/test-nivora-prod` y configurar las env vars reales en Netlify
  2. Verificar que el build pasa
  3. Verificar que las propiedades se renderizan correctamente en staging
  4. Solo entonces mergear `feat/nivora-property-catalog` a `main`
