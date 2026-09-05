# Design System & Patterns

> Documento vivo de patrones de diseño y decisiones técnicas reutilizables en
> los proyectos de Global Move y derivados. Última actualización: 2026-09.

---

## Índice rápido

1. [Tokens (variables CSS)](#1-tokens-variables-css)
2. [⚠️ Tailwind class collisions (LECCIÓN CRÍTICA)](#2-️-tailwind-class-collisions-lección-crítica)
3. [Tipografía](#3-tipografía)
4. [Colores y semántica](#4-colores-y-semántica)
5. [Espaciado y layout](#5-espaciado-y-layout)
6. [Componentes base](#6-componentes-base)
7. [Bilingüismo (i18n) — patrones](#7-bilingüismo-i18n--patrones)
8. [Manejo de imágenes](#8-manejo-de-imágenes)
10. [Formularios (Netlify Forms)](#10-formularios-netlify-forms)
11. [Renderizado condicional — esconder valores vacíos](#11-renderizado-condicional--esconder-valores-vacíos)
12. [Animaciones y motion](#12-animaciones-y-motion)
13. [Deploy en Netlify — checklist](#13-deploy-en-netlify--checklist)
14. [Integración con APIs externas (patrón adapter)](#14-integración-con-apis-externas-patrón-adapter)
15. [Accesibilidad — mínimos obligatorios](#15-acesibilidad--mínimos-obligatorios)
16. [Checklist de revisión visual](#16-checklist-de-revisión-visual)

---

## 1. Tokens (variables CSS)

Definir TODAS las decisiones visuales como custom properties en `:root`. **Nunca**
hardcodear valores mágicos en componentes.

```css
:root {
  /* Color */
  --color-navy: #0A1D3F;
  --color-gold: #C8A76A;
  --color-light: #F5F6F8;
  /* … */

  /* Tipografía */
  --fs-xs: 0.75rem;
  --fs-base: 1rem;
  --fs-xl: 1.5rem;
  /* … */

  /* Espaciado (escala 4px) */
  --space-1: 0.25rem;
  --space-4: 1rem;
  --space-8: 2rem;

  /* Radius, sombra, motion */
  --radius-md: 8px;
  --shadow-md: 0 6px 18px rgba(10, 29, 63, 0.08), 0 2px 6px rgba(10, 29, 63, 0.04);
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-base: 240ms;
}
```

**Por qué:** cambiar un token cambia el sistema entero. Migración y temas
(resultados) sin tocar componentes.

---

## 2. ⚠️ Tailwind class collisions (LECCIÓN CRÍTICA)

**Regla:** NUNCA usar nombres que coincidan con utilities de Tailwind.

### El bug que nos costó

```css
/* Mi utility custom en global.css */
.h-1 {
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.08;
}
/* Tailwind tiene exactamente: */
.h-1 { height: 0.25rem; } /* gana por orden de carga */
```

Resultado: el `<h1>` tenía `height: 4px`, el texto se desbordaba y se montaba
visualmente con el párrafo siguiente.

### Nombres prohibidos (chocan con Tailwind)

Cualquier utility de Tailwind basada en escala numérica:
- `h-{n}` (altura: h-1 = 4px, h-2 = 8px …)
- `w-{n}` (anchura)
- `m-{n}`, `mt-{n}`, `mb-{n}`, `mx-{n}`, `my-{n}` (margin)
- `p-{n}`, `pt-{n}`, `pb-{n}`, `px-{n}`, `py-{n}` (padding)
- `text-{n}` (font-size — el `text-2xl` SÍ vale)
- `gap-{n}`, `space-{n}`
- `top-{n}`, `bottom-{n}`, `left-{n}`, `right-{n}`
- `rounded-{n}`, `shadow-{n}`, `opacity-{n}`

### Patrón seguro

Prefijo siempre con punto + nombre semántico:

| ❌ Peligro | ✅ Seguro |
|---|---|
| `.h-1` | `.h1` |
| `.h-2` | `.h2` |
| `.h-3` | `.h3` |
| `.h-4` | `.h4` |
| `.text-muted` | `.text-muted` ✅ (no choca) |
| `.title` | `.title` ✅ |

Si necesitas jerarquía de headings, usa `.h1`/`.h2`/`.h3`/`.h4` (sin guión).

### Cómo detectarlo rápido

Si un texto se ve raro (overlap, clipped, position weird) → busca primero
clases que coincidan con utilities de Tailwind en `src/styles/`.

---

## 3. Tipografía

### Filosofía: una sola family, jerarquía por peso + tamaño

```css
--font-sans: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-serif: var(--font-sans); /* alias si la marca pide "serif" pero usa sans */
```

Evitamos mezclar families. La jerarquía sale de `font-size` + `font-weight` +
`letter-spacing`.

### Escala de headings

```css
.h-display { font-size: clamp(2.5rem, 6.5vw, 5.25rem); line-height: 1.04; }
.h1        { font-size: clamp(2.25rem, 5vw, 4rem);    line-height: 1.08; }
.h2        { font-size: clamp(1.875rem, 3.6vw, 2.75rem); line-height: 1.12; }
.h3        { font-size: clamp(1.5rem, 2.6vw, 2rem);    line-height: 1.2; }
.h4        { font-size: var(--fs-xl); }
.lead      { font-size: clamp(1.05rem, 1.4vw, 1.2rem); line-height: 1.6; }
```

**`clamp(min, preferred, max)`** para que escale fluido sin media queries.

### Espaciado tipográfico

- Tracking ancho (`tracking-[0.16em]`) en uppercase eyebrows, badges, chips
- Tracking negativo (`letter-spacing: -0.025em`) en headings grandes
- `font-weight: 600` para headings, `400` para body, `500` para emphasis

---

## 4. Colores y semántica

### Paleta mínima viable

- **Brand primario** (navy/blue/black/…)
- **Acento** (gold/orange/…)
- **3 neutros** (claro, medio, oscuro)
- **Estado** (success, warn, error) —solo si los necesitas

### Semántica vs literal

```css
/* ✅ tokens semánticos (lo que usa el código) */
:root {
  --bg-default: var(--color-white);
  --bg-subtle: var(--color-light);
  --bg-dark: var(--color-navy);
  --text-primary: var(--color-charcoal);
  --text-secondary: var(--color-gray-cool);
  --text-on-dark: var(--color-white);
  --accent: var(--color-gold);
}

/* ✅ paleta cruda (solo en :root) */
:root {
  --color-navy: #0A1D3F;
  --color-gold: #C8A76A;
}
```

Si más adelante cambias la paleta (ej. rebranding), tocas `--color-navy` y todo
el sistema se actualiza.

---

## 5. Espaciado y layout

### Container

```css
--container-max: 1280px;
--container-padding: clamp(1rem, 4vw, 2.5rem); /* nunca < 1rem en móvil */
```

`max-width` + `margin-inline: auto` + `padding-inline: var(--container-padding)`.

### Escala (múltiplos de 4px)

`--space-1` (4) hasta `--space-32` (128). **Nunca** usar valores arbitrarios en
componentes; siempre referenciar token.

### Grid 2 columnas responsive

```html
<div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-12 items-start">
  <main>…</main>
  <aside class="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">…</aside>
</div>
```

`items-start` es crítico para que el aside no estire.

---

## 6. Componentes base

### Botones (.btn)

```html
<a class="btn btn--primary">Primary</a>
<a class="btn btn--secondary">Secondary</a>
<a class="btn btn--link">Link</a>
```

Patrón: clase base `.btn` + modificador `--primary/--secondary/--link`. **No**
duplicar estilos inline.

### Badges / chips

```html
<span class="bg-navy/85 text-gold-soft">Disponible</span>
<span class="bg-gold text-navy">Reservado</span>
```

`/85` = opacidad 85% para que el fondo respire sobre imágenes.

### Cards

```html
<article class="bg-white border border-navy/5 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
```

Hover lift: `translate-y-[-N]` + `shadow-2xl` para feedback táctil sutil.

### Eyebrow (etiqueta sobre heading)

```html
<p class="eyebrow">Solicitar información</p>
```

`uppercase + tracking-[0.16em] + gold + small + font-weight: 600`. Patrón
consistente en toda la web.

---

## 7. Bilingüismo (i18n) — patrones

### Estructura de carpetas

```
src/i18n/
├── es.json
└── en.json
```

### Helper

```ts
export const t = (locale: 'es' | 'en', key: string): string => { ... };
```

### Routing dinámico

```
src/pages/[locale]/*.astro  → /es/* y /en/*
src/pages/[locale]/index.astro  → /es/ y /en/
```

`localeParams = ` en `, en`.map(l => ({ params: { locale: l } }))``

**Gotcha:** al iterar `localeParams` en `getStaticPaths`, **desestructurar**:

```ts
// ❌ Mal — Astro espera strings, recibe object
for (const locale of localeParams) { ... }

// ✅ Bien
for (const { params: { locale } } of localeParams) { ... }
```

### Contenido localizado (NO en JSON)

Cuando el contenido es largo, usar **fallback ES → EN** en lugar de duplicar:

```ts
const npFeatures = np.features ?? { es: [], en: [] };
const features = {
  es: Array.isArray(npFeatures.es) ? npFeatures.es : [],
  en: Array.isArray(npFeatures.en) ? npFeatures.en : [],
};
```

Y en UI:
```ts
const en = features.en.length > 0 ? features.en : features.es;
```

### Estados / labels traducidos

```ts
export const statusLabel = (status: 'available' | 'reserved', locale: 'es' | 'en') => {
  if (locale === 'es') return status === 'available' ? 'Disponible' : 'Reservado';
  return status === 'available' ? 'Available' : 'Reserved';
};
```

**Nunca** dejar literales hardcoded en templates — siempre vía helper.

---

## 8. Manejo de imágenes

### Object-position desde focal point

Cuando un CMS te da `{focalPoint: {x: 0..100, y: 0..100}}`:

```ts
function focalPointToObjectPosition({x, y}: {x: number; y: number}): string {
  return `${x}% ${y}%`;
}
```

**NO** usar `"center ${y}% center ${x}%"` — es CSS redundante.

Default: `object-position: center 62%` (la mayoría de fotos arquitectónicas
quedan centradas ligeramente por debajo del centro).

### Alt text

**Nunca** vacío salvo en imágenes puramente decorativas (y entonces `alt=""`).
Para contenido: usar el nombre/título de la entidad, no descripción del visual.

### Lazy load

```html
<img src="..." alt="..." loading="lazy" decoding="async" />
```

Solo la imagen hero: `loading="eager" fetchpriority="high"`.

### Aspect ratios fijos

```html
<div class="aspect-[4/3] overflow-hidden">
  <img class="w-full h-full object-cover" />
</div>
```

Evita CLS y mantiene consistencia visual.

---

## 10. Formularios (Netlify Forms)

Para formularios estáticos sin backend:

```html
<form name="property-inquiry" method="POST" data-netlify="true" novalidate>
  <input type="hidden" name="form-name" value="property-inquiry" />
  ...
</form>
```

- `name` en el form (Netlify lo detecta)
- `data-netlify="true"` 
- Hidden `form-name` para que Netlify sepa cuál es cuando hay varios
- `novalidate` para validación custom sin warnings del navegador

Luego en Netlify dashboard → Forms → ver submissions.

---

## 11. Renderizado condicional — esconder valores vacíos

Cuando un campo puede venir `null` / `0` / `undefined`, **no** mostrar "0 m²"
o "0 habitaciones". Esconder el bloque entero:

```astro
{(property.bedrooms || property.bathrooms || property.sizeM2) && (
  <>
    <div class="h-px bg-navy/5 my-5"></div>
    <div class="flex justify-between ...">
      {property.bedrooms && <span>...</span>}
      ...
    </div>
    <div class="h-px bg-navy/5 my-5"></div>
  </>
)}
```

**También los divisores deben ser condicionales** — si no, queda un gap visual
feo entre líneas vacías.

### Deduplicación de strings (case-insensitive)

Cuando el mismo concepto aparece dos veces con casing distinto:

```ts
// "Madrid" vs "MADRID" — son lo mismo, no mostrar duplicado
const showLocation = location.localeCompare(zone, undefined, { sensitivity: 'base' }) !== 0;
```

`sensitivity: 'base'` = case + accent insensitive. `'accent'` solo accent.

---

## 12. Animaciones y motion

### Respetar `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Duración estándar

- `180ms` (fast) — hovers, toggles
- `240ms` (base) — interacciones generales
- `400-700ms` (slow) — reveals, transiciones de página

### IntersectionObserver para reveals

```ts
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('revealed');
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
```

Threshold 0.15 = empieza cuando el 15% del elemento está visible.

### Magnetic CTAs (efecto premium)

```js
btn.addEventListener('mousemove', (e) => {
  const rect = btn.getBoundingClientRect();
  const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
  const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
  btn.style.transform = `translate(${x}px, ${y}px)`;
});
```

Factor 0.25 = movimiento sutil, no exagerado.

---

## 13. Deploy en Netlify — checklist

### Variables de entorno

Configurar en Site settings → Environment variables. **Para deploy previews**:
hay un tab separado "Deploy Previews" donde defines qué vars se inyectan en PRs.

```
NIVORA_API_URL=https://api-nivora.example.com
NIVORA_SITE_KEY=your-site-key
NIVORA_CATALOG_TOKEN=your-bearer-token
```

### ⚠️ Secret scanner gotcha

Netlify escanea el código buscando **literales** de las env vars. Si pones
`NIVORA_API_URL=https://api.example.com` en `.env.example` como ejemplo, el
build falla.

**Fix:** en `.env.example` y docs, usar placeholders obvios:

```diff
- NIVORA_API_URL=https://api-nivora.decotea.es
- NIVORA_SITE_KEY=glovalmove
+ NIVORA_API_URL=<your-nivora-api-url>
+ NIVORA_SITE_KEY=<your-nivora-site-key>
```

Si te bloquea en producción, opciones en orden de preferencia:
1. Reemplazar literales por placeholders en código (correcto)
2. `SECRETS_SCAN_OMIT_KEYS=NIVORA_API_URL,NIVORA_SITE_KEY` (en Deploy Previews)
3. `SECRETS_SCAN_ENABLED=false` (último recurso, pierde la red de seguridad)

### Build command

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### PR deploy previews

Netlify auto-deploya cada push a una PR abierta. El bot comenta en la PR
con la URL. Si no hay push, no hay preview → push vacío para forzar rebuild.

### Caché

Limpiar caché en Site settings → Build & deploy → Clear cache, o marcar
"Clear cache before retrying deploy" en cada retry.

---

## 14. Integración con APIs externas (patrón adapter)

### Estructura recomendada

```
src/data/
├── external-api-catalog.ts   # cliente HTTP + tipos + validación
├── property-source.ts        # mapper → modelo UI + fallback
└── properties.ts             # tipos UI + fixture fallback
```

### Capas separadas

1. **Cliente HTTP** (nivora-catalog.ts): fetch, validación runtime, error tipado
2. **Mapper** (property-source.ts): API → modelo UI
3. **UI** (componentes): consume solo el modelo UI

### Validación runtime estricta

```ts
if (r.schemaVersion !== '1.0') {
  throw new NivoraError(`schemaVersion inválido: "${r.schemaVersion}"`);
}
```

Mejor fallar ruidosamente que aceptar datos malformados. **Throws explícitos**.

### Tipos strictos, no permissivos

```ts
// ❌ Mapear cualquier cosa a 'villa' (mentira)
const type = api.type ?? 'villa';

// ✅ Tirar si llega un type no soportado
function requireKnownType(np: PublicProperty): PropertyType {
  const allowed = ['apartment', 'house', ...]; // 11 literales del contrato
  if (!allowed.includes(np.type)) {
    throw new Error(`Tipo no soportado: "${np.type}"`);
  }
  return np.type as PropertyType;
}
```

### Fallback solo en desarrollo

```ts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!IS_PRODUCTION) {
  try {
    return await fetchExternal();
  catch (err) {
    console.warn(`External API falló: ${err.message}, usando fixture.`);
    return loadFixture();
  }
}
// Producción: build roto si la API falla.
return await fetchExternal();
```

En producción, **no** fallback silencioso — el build debe fallar.

### Memoización en build

```ts
let memoCache: PublicCatalogResponse | null = null;

export async function fetchCatalog(): Promise<PublicProperty[]> {
  if (memoCache) return memoCache.properties;
  // ...fetch + validate
  memoCache = { data, ts: Date.now() };
  return memoCache.properties;
}
```

Cada `astro build` arranca proceso nuevo → siempre datos frescos. Sin stale
data entre deploys.

---

## 15. Accesibilidad — mínimos obligatorios

- **`aria-label`** en botones/iconos sin texto
- **`aria-current="page"`** en nav del item activo
- **`focus-visible`** con outline gold/navy en todos los interactivos
- **`prefers-reduced-motion`** respetado
- Contraste WCAG AA en texto (especialmente gold sobre blanco → usar `--` solo para texto/24 )
- Skip link al main desde el header (`<a href="#main" class="sr-only">Saltar al contenido</a>`)
- Formularios con `<label for="id">` o `aria-label`

---

## 16. Checklist de revisión visual

Antes de mergear un cambio de UI:

- [ ] **No overflows / overlaps** de texto (especialmente headings — ver §2)
- [ ] **No "0" literales** en specs/dimensiones cuando vienen null
- [ ] **No strings duplicados** (Madrid vs MADRID) — case-insensitive compare
- [ ] **Imágenes tienen alt text** real (no `alt=""` salvo decorativas)
- [ ] **Hover/focus states** visibles en todos los interactivos
- [ ] **Mobile (< 720px)**: sticky CTAs no cubren footer, drawer nav funcional
- [ ] **Bilingüe**: ES y EN renderizan sin literales crudos
- [ ] **Build local pasa**: `npm run build` sin errores
- [ ] **Netlify secret scanner pasa** (literales fuera de `.env`)
- [ ] **Deploy preview verificado** antes de merge

---

## Apéndice: Lecciones aprendidas (postmortems)

### Bug #1: `.h-1` colisión Tailwind
**Síntoma:** heading "PISO JUNTO AL RETIRO" se solapaba con párrafo siguiente.
**Causa:** mi `.h-1` chocaba con Tailwind `h-1` (height: 4px).
**Fix:** renombrar a `.h1` + propagar a los 3 archivos que lo usaban.
**Lección:** ver §2 — nunca nombres que coincidan con utilities.

### Bug #2: "Madrid · MADRID" duplicado
**Síntoma:** cada card mostraba la zona dos veces.
**Causa:** comparador `localeCompare(... { sensitivity: 'accent' })` no es case-insensitive.
**Fix:** cambiar a `{ sensitivity: 'base' }` (case + accent insensitive).

### Bug #3: Netlify secret scanner
**Síntoma:** build fallaba con "Secrets scanning found secrets in build".
**Causa:** los ejemplos literales en `.env.example` y docs eran los mismos
strings que las env vars reales.
**Fix:** placeholders genéricos `<your-...>`.

### Bug #4: `getStaticPaths` esperaba string, recibía object
**Síntoma:** "Invalid getStaticPaths route parameter for locale. Expected
string, received object".
**Causa:** `for (const locale of localeParams)` donde cada `locale` era
`{params: {locale: 'es'}}`.
**Fix:** destructurar → `for (const { params: { locale } } of localeParams)`.

### Bug #5: `site` en Nivora era objeto, no string
**Síntoma:** "Falta o es inválido el campo site (recibido: [object Object])".
**Causa:** el tipo asumía `site: string`, el contrato real devuelve
`site: { key, name, domain? }`.
**Fix:** actualizar tipo + validador.

### Bug #6: `formatPrice` no estaba importado
**Síntoma:** "formatPrice is not defined" en book/[slug].astro.
**Causa:** el import original no lo incluía.
**Fix:** agregar a la lista de imports desde `../../../data/properties`.