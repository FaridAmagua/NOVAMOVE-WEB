// netlify/functions/create-payment.ts
// Creates a Redsys REST payment session and returns the redirect URL.
//
// Configure these environment variables in Netlify dashboard (or in `.env` for local dev):
//   REDSYS_MERCHANT_CODE  (DS_MERCHANT_MERCHANTCODE)
//   REDSYS_TERMINAL       (DS_MERCHANT_TERMINAL, e.g. "1")
//   REDSYS_SECRET_KEY     (Base64 encoded key provided by Redsys)
//   REDSYS_ENV            ("test" or "prod", defaults to "test")
//   SITE_URL              (Base URL of the site, e.g. "https://globalmove.com")
//
// Test credentials from Redsys docs (sandbox):
//   Merchant code: 999008881
//   Terminal:      1
//   Secret key:    sq7HjrUOBfKmC576ILgskD5srU870gJ7
//   Test card:     4548 8120 0000 0003 (CVV 123, exp 12/49)

import type { Handler } from '@netlify/functions';
import crypto from 'node:crypto';

const REDSYS_ENDPOINTS = {
  test: 'https://sis-t.redsys.es:25443/v1/rest',
  prod: 'https://secure.redsys.es:20443/v1/rest',
} as const;

interface BookingPayload {
  propertyId: string;
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    specialRequests?: string;
  };
  locale: string;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 3DES-CBC encryption with 3-key (EDE) as required by Redsys.
 * IV is fixed at 8 zero bytes.
 */
function tripleDesEncrypt(data: string, base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 24) {
    throw new Error(`Redsys key must be 24 bytes (3DES). Got ${key.length}.`);
  }
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  return encrypted;
}

/**
 * Generate a unique Redsys order id (max 12 chars, numeric + dash + underscore).
 * Format: GM + YYYYMMDD + 4 random digits  →  GM202607291234
 */
function generateOrderId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GM${yyyy}${mm}${dd}${rand}`.slice(0, 12);
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload: BookingPayload;
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    MERCHANT_CODE = '999008881',
    TERMINAL = '1',
    SECRET_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
    REDSYS_ENV = 'test',
    SITE_URL = 'https://globalmove.com',
  } = process.env;

  const orderId = generateOrderId();
  // Redsys expects amount in cents (no decimals). 100.00 EUR = 10000
  const amountCents = Math.round(payload.total * 100);

  const merchantParams = {
    Ds_Merchant_Amount: amountCents.toString(),
    Ds_Merchant_Order: orderId,
    Ds_Merchant_MerchantCode: MERCHANT_CODE,
    Ds_Merchant_Currency: '978', // EUR
    Ds_Merchant_TransactionType: '0', // authorization
    Ds_Merchant_Terminal: TERMINAL,
    Ds_Merchant_Description: `Reserva ${payload.propertySlug} - ${payload.nights}n`,
    Ds_Merchant_Titular: payload.guest.firstName + ' ' + payload.guest.lastName,
    Ds_Merchant_UrlOK: `${SITE_URL}/${payload.locale}/book/success?ref=${orderId}&prop=${payload.propertySlug}`,
    Ds_Merchant_UrlKO: `${SITE_URL}/${payload.locale}/book/cancelled`,
    Ds_Merchant_NotificationUrl: `${SITE_URL}/.netlify/functions/redsys-notification`,
    Ds_Merchant_ConsumerLanguage: '001', // Spanish
    Ds_Merchant_DirectPayment: 'false',
    Ds_Merchant_MerchantData: Buffer.from(JSON.stringify({
      email: payload.guest.email,
      propertySlug: payload.propertySlug,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      nights: payload.nights,
      firstName: payload.guest.firstName,
      lastName: payload.guest.lastName,
      phone: payload.guest.phone,
      country: payload.guest.country,
      specialRequests: payload.guest.specialRequests,
    })).toString('base64'),
  };

  const jsonPayload = JSON.stringify(merchantParams);

  // 1. 3DES-CBC encrypt the JSON payload
  const encrypted = tripleDesEncrypt(jsonPayload, SECRET_KEY);
  // 2. SHA-256 of the encrypted result, then Base64
  const signature = crypto.createHash('sha256').update(encrypted).digest('base64');

  const redsysRequest = {
    Ds_SignatureVersion: 'HMAC_SHA256_V1',
    Ds_MerchantParameters: base64UrlEncode(Buffer.from(jsonPayload)),
    Ds_Signature: signature,
  };

  const redsysEndpoint = REDSYS_ENDPOINTS[(REDSYS_ENV as 'test' | 'prod')] ?? REDSYS_ENDPOINTS.test;

  try {
    const redsysResponse = await fetch(redsysEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(redsysRequest),
    });

    const responseText = await redsysResponse.text();
    let parsed: any = {};
    try { parsed = JSON.parse(responseText); } catch {}

    // In test mode, Redsys can be unreachable from a Netlify sandboxed function
    // and you may want to mock the success path during development.
    if (!parsed || !parsed.redsysUrl) {
      console.error('[create-payment] Unexpected Redsys response:', responseText.slice(0, 500));
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Redsys unreachable',
          devHint: 'Set REDSYS_ENV=prod with real credentials, or test locally with curl against sis-t.redsys.es',
          details: responseText.slice(0, 200),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        redsysUrl: parsed.redsysUrl,
        testMode: REDSYS_ENV === 'test',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Payment initiation failed', details: String(err) }),
    };
  }
};