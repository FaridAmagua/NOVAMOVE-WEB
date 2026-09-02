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
//   NIVORA_SITE_KEY      Identificador público del sitio
//   NIVORA_CATALOG_TOKEN Token Bearer
//
// Caché: memoización en memoria durante el mismo proceso de build.
// Cada `astro build` arranca proceso nuevo, así que siempre se consulta
// datos frescos de Nivora (no hay stale data entre deploys).

// ── Tipos del contrato Nivora ─────────────────────────────────────────────

export type NivoraLocalizedField<T = string> = {
  es: T;
  en?: T;
};

export type NivoraPropertyType =
  | 'villa' | 'apartment' | 'finca' | 'penthouse'
  | 'townhouse' | 'duplex' | 'studio' | 'loft'
  | string;

export type NivoraOperation = 'rent' | 'sale' | string;

export type NivoraStatus = 'available' | 'reserved' | 'unavailable' | string;

/** Estructura detallada de specs (estructura flexible, se accede por clave). */
export type NivoraSpecs = Record<string, number | string | boolean | null | undefined>;

export type NivoraImage = {
  url: string;
  position: number;
  isCover?: boolean;
  alt?: string;
  focal?: string;
};

export interface NivoraProperty {
  id: string;
  slug: string;
  content: {
    title: NivoraLocalizedField;
    tagline?: NivoraLocalizedField;
    description: NivoraLocalizedField;
  };
  features: NivoraLocalizedField;
  pricing: {
    amountCents: number;
    currency: string;          // ej: "EUR"
    period: string;            // ej: "month", "week", "night"
  };
  specs: NivoraSpecs;
  images: NivoraImage[];
  operation: NivoraOperation;
  type: NivoraPropertyType;
  status: NivoraStatus;
  /** Opcionales según contrato. */
  featured?: boolean;
  lat?: number;
  lng?: number;
  zone?: string;
  // Reviews no incluidas en este contrato
}

export interface NivoraCatalogResponse {
  properties: NivoraProperty[];
  /** Otros campos que Nivora pueda añadir — se preservan sin tocar. */
  [key: string]: unknown;
}

// ── Errores tipados ───────────────────────────────────────────────────────

export class NivoraError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NivoraError';
    this.cause = cause;
  }
}

// ── Fetch + caché en memoria ─────────────────────────────────────────────

interface NivoraConfig {
  apiUrl: string;
  siteKey: string;
  token: string;
}

function readConfig(): NivoraConfig {
  const apiUrl = process.env.NIVORA_API_URL?.trim();
  const siteKey = process.env.NIVORA_SITE_KEY?.trim();
  const token = process.env.NIVORA_CATALOG_TOKEN?.trim();
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

async function callNivora(cfg: NivoraConfig): Promise<NivoraCatalogResponse> {
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
    return (await res.json()) as NivoraCatalogResponse;
  } catch (err) {
    throw new NivoraError(`La respuesta de Nivora no es JSON válido: ${(err as Error).message}`, err);
  }
}

function validateResponse(data: unknown): NivoraCatalogResponse {
  if (!data || typeof data !== 'object' || !Array.isArray((data as NivoraCatalogResponse).properties)) {
    throw new NivoraError(
      `La respuesta de Nivora no contiene 'properties' como array (recibido: ${JSON.stringify(data).slice(0, 200)})`
    );
  }
  return data as NivoraCatalogResponse;
}

// ── Memoización en memoria durante el proceso de build ───────────────────

interface NivoraMemoEntry {
  data: NivoraCatalogResponse;
  ts: number;
}

let memoCache: NivoraMemoEntry | null = null;

function getMemoized(): NivoraCatalogResponse | null {
  return memoCache?.data ?? null;
}

function setMemoized(data: NivoraCatalogResponse): void {
  memoCache = { data, ts: Date.now() };
}

export function clearNivoraCache(): void {
  memoCache = null;
}

export async function fetchNivoraCatalog(): Promise<NivoraProperty[]> {
  const cached = getMemoized();
  if (cached) return cached.data.properties;

  const cfg = readConfig();
  const raw = validateResponse(await callNivora(cfg));
  setMemoized(raw);
  return raw.properties;
}
