/// <reference types="node" />
// src/data/nivora-catalog.ts
//
// Cliente Nivora para NOVAMOVE-WEB.
// Se invoca desde código ejecutado durante el build de Astro (Node).
//
// Endpoint (exacto, del contrato):
//   GET {NIVORA_API_URL}/v1/public/sites/{NIVORA_SITE_KEY}/properties
//
// Headers:
//   Authorization: Bearer {NIVORA_CATALOG_TOKEN}
//   Accept:        application/json
//
// Variables de entorno requeridas:
//   NIVORA_API_URL       Base URL (ej: https://api-nivora.decotea.es)
//   NIVORA_SITE_KEY      Identificador público del sitio (ej: glovalmove)
//   NIVORA_CATALOG_TOKEN Token Bearer
//
// Caché: memoización en memoria durante el mismo proceso de build.
// Cada `astro build` arranca proceso nuevo, así que siempre se consulta
// datos frescos de Nivora (no hay stale data entre deploys).

// ── Tipos exactos del contrato Nivora ───────────────────────────────────

export type LocalizedPropertyContent = {
  title: string;
  tagline?: string;
  description: string;
  publicLocation: string;
};

export type PublicProperty = {
  id: string;
  slug: string;
  reference: string;
  operation: 'rent' | 'sale';
  type:
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
  status: 'available' | 'reserved';
  featured: boolean;

  content: {
    es: LocalizedPropertyContent;
    en?: LocalizedPropertyContent;
  };

  pricing: {
    amountCents: number;
    currency: 'EUR';
    period: 'month' | null;
  };

  specs: {
    bedrooms: number | null;
    bathrooms: number | null;
    builtAreaSqm: number | null;
    usableAreaSqm: number | null;
    plotAreaSqm: number | null;
  };

  features: {
    es: string[];
    en?: string[];
  };

  images: Array<{
    id: string;
    url: string;
    alt: string;
    width: number;
    height: number;
    isCover: boolean;
    position: number;
  }>;

  publishedAt: string;
  updatedAt: string;
};

export type PublicCatalogResponse = {
  schemaVersion: '1.0';
  site: {
    key: string;
    name: string;
    domain?: string;
  };
  generatedAt: string;
  properties: PublicProperty[];
};

// ── Error tipado ────────────────────────────────────────────────────────

export class NivoraError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NivoraError';
    this.cause = cause;
  }
}

// ── Fetch + caché en memoria ────────────────────────────────────────────

interface NivoraConfig {
  apiUrl: string;
  siteKey: string;
  token: string;
}

function readConfig(): NivoraConfig {
  const apiUrl = process.env['NIVORA_API_URL']?.trim();
  const siteKey = process.env['NIVORA_SITE_KEY']?.trim();
  const token = process.env['NIVORA_CATALOG_TOKEN']?.trim();
  if (!apiUrl || !siteKey || !token) {
    throw new NivoraError(
      'Faltan variables de entorno de Nivora. Configura NIVORA_API_URL, NIVORA_SITE_KEY y NIVORA_CATALOG_TOKEN (en Netlify dashboard o .env local).'
    );
  }
  return { apiUrl, siteKey, token };
}

function endpointUrl(cfg: NivoraConfig): string {
  const base = cfg.apiUrl.replace(/\/$/, '');
  return `${base}/v1/public/sites/${encodeURIComponent(cfg.siteKey)}/properties`;
}

async function callNivora(cfg: NivoraConfig): Promise<unknown> {
  const url = endpointUrl(cfg);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new NivoraError(
      `Error de red al conectar con Nivora (${url}): ${(err as Error).message}`,
      err
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new NivoraError(
      `Nivora devolvió ${res.status} ${res.statusText} desde ${url}${body ? `: ${body.slice(0, 200)}` : ''}`
    );
  }

  try {
    return await res.json();
  } catch (err) {
    throw new NivoraError(`La respuesta de Nivora no es JSON válido: ${(err as Error).message}`, err);
  }
}

// ── Validación de la respuesta ─────────────────────────────────────────

function validateResponse(raw: unknown): PublicCatalogResponse {
  if (!raw || typeof raw !== 'object') {
    throw new NivoraError('La respuesta de Nivora no es un objeto');
  }
  const r = raw as Partial<PublicCatalogResponse>;

  if (r.schemaVersion !== '1.0') {
    throw new NivoraError(
      `schemaVersion inválido: "${String(r.schemaVersion)}" (esperado "1.0")`
    );
  }
  if (
    !r.site ||
    typeof r.site !== 'object' ||
    typeof (r.site as { key?: unknown }).key !== 'string' ||
    typeof (r.site as { name?: unknown }).name !== 'string'
  ) {
    throw new NivoraError(`Falta o es inválido el campo "site" (recibido: ${String(r.site)})`);
  }
  if (typeof r.generatedAt !== 'string') {
    throw new NivoraError(`Falta o es inválido el campo "generatedAt"`);
  }
  if (!Array.isArray(r.properties)) {
    throw new NivoraError(
      `El campo "properties" no es un array (recibido: ${typeof r.properties})`
    );
  }

  // Validar cada propiedad estructuralmente
  for (const p of r.properties) {
    if (!p || typeof p !== 'object') {
      throw new NivoraError(`Propiedad inválida en respuesta de Nivora: ${JSON.stringify(p)}`);
    }
    if (!p.id || !p.slug) {
      throw new NivoraError(`Propiedad sin id/slug: ${JSON.stringify(p)}`);
    }
    if (!p.content?.es?.title || !p.content?.es?.description || !p.content?.es?.publicLocation) {
      throw new NivoraError(
        `Propiedad ${p.id} sin content.es.title/description/publicLocation`
      );
    }
    if (typeof p.pricing?.amountCents !== 'number' || p.pricing?.currency !== 'EUR') {
      throw new NivoraError(
        `Propiedad ${p.id} sin pricing.amountCents/currency válidos`
      );
    }
    if (p.operation !== 'rent' && p.operation !== 'sale') {
      throw new NivoraError(
        `Propiedad ${p.id} con operation inválido: "${String(p.operation)}"`
      );
    }
    if (!Array.isArray(p.images)) {
      throw new NivoraError(`Propiedad ${p.id} sin images[]`);
    }
  }

  return r as PublicCatalogResponse;
}

// ── Memoización en memoria durante el proceso de build ───────────────────

interface NivoraMemoEntry {
  data: PublicCatalogResponse;
  ts: number;
}

let memoCache: NivoraMemoEntry | null = null;

export async function fetchNivoraCatalog(): Promise<PublicProperty[]> {
  const cached = memoCache;
  if (cached) return cached.data.properties;

  const cfg = readConfig();
  const raw = await callNivora(cfg);
  const validated = validateResponse(raw);
  memoCache = { data: validated, ts: Date.now() };
  return validated.properties;
}

export function clearNivoraCache(): void {
  memoCache = null;
}
