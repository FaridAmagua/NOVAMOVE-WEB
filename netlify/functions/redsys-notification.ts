// netlify/functions/redsys-notification.ts
// Redsys webhook (called by Redsys server-to-server after the user pays).
// Verifies the signature and stores the result.
//
// In production, hook this up to a real storage (Airtable, Supabase, your CRM, ...)
// and send a confirmation email. Here we log to console and append to a JSON file
// served from /tmp (works on Netlify for ephemeral storage).

import type { Handler } from '@netlify/functions';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

interface RedsysNotificationPayload {
  Ds_Date: string;
  Ds_Hour: string;
  Ds_Amount: string;
  Ds_Currency: string;
  Ds_Order: string;
  Ds_MerchantCode: string;
  Ds_Terminal: string;
  Ds_Response: string;
  Ds_MerchantData?: string;
  Ds_Signature?: string;
  Ds_TransactionType?: string;
  Ds_SecuredPayment?: string;
}

const STORE_PATH = '/tmp/global-move-bookings.json';

/**
 * Redsys response codes where the first digit == 0 mean "authorised".
 * E.g. 0000-0099 success. 0900 success too. Anything else is rejected.
 */
function isAuthorised(code: string): boolean {
  return code.length >= 1 && code[0] === '0';
}

/**
 * Redsys sends the notification as form-urlencoded key=value pairs.
 * The "Ds_MerchantParameters" value is a Base64-encoded JSON object containing the actual data.
 * The "Ds_Signature" is computed by Redsys as:
 *   1) 3DES-CBC encrypt Ds_MerchantParameters with secret key
 *   2) SHA-256 the encrypted result and Base64
 *
 * We do the same and compare.
 */
function verifySignature(base64MerchantParams: string, signature: string, secretKey: string): boolean {
  try {
    // Decode key from Base64
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== 24) return false;
    const iv = Buffer.alloc(8, 0);
    // Decrypt: Redsys encrypts Ds_MerchantParameters, we decrypt it back
    const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
    let decrypted = decipher.update(base64MerchantParams, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    // Compute signature: SHA-256 of the Base64 merchant params, then Base64
    const expected = crypto.createHash('sha256').update(base64MerchantParams).digest('base64');
    return expected === signature;
  } catch (err) {
    console.error('[redsys-notification] signature verify error', err);
    return false;
  }
}

async function readStore(): Promise<any[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeStore(records: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('[redsys-notification] writeStore error', err);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secretKey = process.env.REDSYS_SECRET_KEY ?? 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

  // Redsys sends form-urlencoded: Ds_MerchantParameters=...&Ds_Signature=...
  let params = new URLSearchParams(event.body ?? '');
  // Some gateways wrap form values; try JSON fallback
  if (!params.get('Ds_MerchantParameters') && event.body) {
    try {
      const parsed = JSON.parse(event.body);
      params = new URLSearchParams(parsed);
    } catch {}
  }

  const base64MerchantParams = params.get('Ds_MerchantParameters') ?? '';
  const signature = params.get('Ds_Signature') ?? '';

  if (!base64MerchantParams || !signature) {
    console.warn('[redsys-notification] Missing params/signature');
    return { statusCode: 400, body: 'Missing parameters' };
  }

  // 1. Verify signature
  const isValid = verifySignature(base64MerchantParams, signature, secretKey);
  if (!isValid) {
    console.warn('[redsys-notification] Invalid signature — possible tampering');
    // Redsys expects HTTP 200 even on errors, otherwise it will retry.
    return { statusCode: 200, body: 'OK' };
  }

  // 2. Decode payload
  let payload: RedsysNotificationPayload;
  try {
    const json = Buffer.from(base64MerchantParams, 'base64').toString('utf8');
    payload = JSON.parse(json);
  } catch (err) {
    console.error('[redsys-notification] Cannot decode merchant params', err);
    return { statusCode: 200, body: 'OK' };
  }

  // 3. Extract booking context from Ds_MerchantData (Base64 JSON set by us in create-payment)
  let merchantData: any = {};
  if (payload.Ds_MerchantData) {
    try {
      merchantData = JSON.parse(Buffer.from(payload.Ds_MerchantData, 'base64').toString('utf8'));
    } catch {}
  }

  const authorised = isAuthorised(payload.Ds_Response);
  const record = {
    receivedAt: new Date().toISOString(),
    order: payload.Ds_Order,
    amount: Number(payload.Ds_Amount) / 100,
    currency: payload.Ds_Currency,
    response: payload.Ds_Response,
    authorised,
    status: authorised ? 'PAID' : 'DECLINED',
    propertySlug: merchantData.propertySlug,
    email: merchantData.email,
    checkIn: merchantData.checkIn,
    checkOut: merchantData.checkOut,
    guests: merchantData.guests,
    nights: merchantData.nights,
    guest: {
      firstName: merchantData.firstName,
      lastName: merchantData.lastName,
      phone: merchantData.phone,
      country: merchantData.country,
      specialRequests: merchantData.specialRequests,
    },
  };

  console.log('[redsys-notification] Booking:', JSON.stringify(record, null, 2));

  // 4. Persist
  const store = await readStore();
  store.push(record);
  await writeStore(store);

  // 5. (TODO) Send confirmation email via Resend/SendGrid
  // if (authorised) await sendConfirmationEmail(record);

  // Redsys requires HTTP 200 with body containing the response code echoed back.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: payload.Ds_Response,
  };
};