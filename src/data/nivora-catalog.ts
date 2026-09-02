// src/data/nivora-catalog.ts
//
// Cliente Nivora: consulta el catálogo de propiedades directamente desde
// código ejecutado durante el build de Astro (Node).
//
// Variables de entorno requeridas:
//   NIVORA_API_URL       Base URL de la API (ej: https://api.nivora.com)
//   NIVORA_SITE_KEY      Identificador público del sitio
//   NIVORA_CATALOG_TOKEN Token de autenticación
//
// Endpoint asumido: GET {NIVORA_API_URL}/v1/properties
// Headers:
//   Authorization:    Bearer {NIVORA_CATALOG_TOKEN}
//   X-Site-Key:       {NIVORA_SITE_KEY}
//   Accept:           application/json
//
// ⚠️ El esquema del JSON y la ruta exacta del endpoint son ASUNCIONES.
// Ajustar NIVORA_ENDPOINT_OVERRIDE (env var opcional) si Nivora expone
// otra ruta. Cuando llegue el contrato real, validar contra este esquema.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '../../.nivora-cache');
const CACHE_FILE = resolve(CACHE_DIR, 'catalog.json');
const CACHE_TTL_MS = 1000 * 60 * 60; // 1h

export class NivoraError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = 'NivoraError';
  }
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export type NivoraPropertyType =
  | 'villa'
  | 'apartment'
  | 'finca'
  | 'penthouse'
  | 'townhouse'
  | 'duplex'
  | 'studio'
  | 'loft'
  | string;

export interface NivoraLocalizedField<T = string> {
  es: T;
  en?: T;
}

export interface NivoraLocation {
  zone: string;                              // zona pública libre (ej: "Marbella East")
  address: NivoraLocalizedField;
}

export interface NivoraProperty {
  id: string;
  slug?: string;                             // fallback → id
  type: NivoraPropertyType;
  title: NivoraLocalizedField;
  tagline?: NivoraLocalizedField;
  description: NivoraLocalizedField;
  location: NivoraLocation;
  bedrooms: number;
  bathrooms: number;
  sizeM2: number;
  /** Precio mensual en EUR (alquiler larga duración). */
  priceMonthly: number;
  minMonths?: number;
  maxGuests?: number;
  status: 'available' | 'reserved' | 'unavailable';
  availableFrom?: string;                    // ISO date
  images: string[];
  amenities: string[];
  primaryImageFocal?: string;                // ej: "62%"
  featured?: boolean;
  lat?: number;
  lng?: number;
}

interface NivoraCatalogResponse {
  properties: NivoraProperty[];
  generatedAt?: string;
  /** Otros campos que Nivora pueda añadir — se preservan sin tocar. */
  [key: string]: unknown;
}

// ── Fetch ──────────────────────────────────────────────────────────────────

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

function endpointUrl(apiUrl: string): string {
  // Permite override explícito si Nivora expone otra ruta
  const override = process.env.NIVORA_ENDPOINT_OVERRIDE?.trim();
  if (override) return override;
  return `${apiUrl.replace(/\/$/, '')}/v1/properties`;
}

async function callNivora(cfg: NivoraConfig): Promise<NivoraProperty[]> {
  const url = endpointUrl(cfg.apiUrl);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'X-Site-Key': cfg.siteKey,
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

  let data: NivoraCatalogResponse | NivoraProperty[];
  try {
    data = (await res.json()) as NivoraCatalogResponse | NivoraProperty[];
  } catch (err) {
    throw new NivoraError(`La respuesta de Nivora no es JSON válido: ${(err as Error).message}`, err);
  }

  const properties = Array.isArray(data) ? data : data.properties;
  if (!Array.isArray(properties)) {
    throw new NivoraError(
      `La respuesta de Nivora no contiene un array 'properties' (recibido: ${JSON.stringify(data).slice(0, 200)})`
    );
  }

  return properties;
}

function loadFromCache(): { properties: NivoraProperty[]; fetchedAt: number } | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    if (!raw || typeof raw.fetchedAt !== 'number' || !Array.isArray(raw.properties)) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeCache(properties: NivoraProperty[]): void {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ properties, fetchedAt: Date.now() }, null, 2)
    );
  } catch (err) {
    console.warn(`[nivora] no se pudo escribir cache en ${CACHE_FILE}: ${(err as Error).message}`);
  }
}

export async function fetchNivoraCatalog(opts: { forceRefresh?: boolean } = {}): Promise<NivoraProperty[]> {
  const cfg = readConfig();

  // 1) Cache fresca si existe (acelera builds repetidos)
  if (!opts.forceRefresh) {
    const cached = loadFromCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.properties;
    }
  }

  // 2) Fetch a Nivora (puede fallar — siempre propaga el error)
  const properties = await callNivora(cfg);

  // 3) Cache para el próximo build
  writeCache(properties);

  return properties;
}

// Helper de un solo uso para limpiar cache (útil si Nivora cambia el esquema)
export function clearNivoraCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      const { unlinkSync } = require('node:fs');
      unlinkSync(CACHE_FILE);
    }
  } catch {
    /* noop */
  }
}
