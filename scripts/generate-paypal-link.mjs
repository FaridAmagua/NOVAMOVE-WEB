#!/usr/bin/env node
/**
 * generate-paypal-link.mjs
 *
 * CLI interactivo para generar links PayPal.me para reservas manuales
 * (tipo "amigo"). Soporta estancias cortas (noches/semanas) y largas
 * (meses/año). Calcula el precio desde src/data/properties.ts y emite
 * un link copiable listo para enviar por WhatsApp/email.
 *
 * Uso:
 *   node scripts/generate-paypal-link.mjs
 *   node scripts/generate-paypal-link.mjs --user globalmove \
 *     --slug villa-mediterranea-marbella --nights 7 --guests 6
 *   node scripts/generate-paypal-link.mjs --user globalmove \
 *     --slug villa-mediterranea-marbella --months 3 --guests 4
 *   node scripts/generate-paypal-link.mjs --user globalmove \
 *     --slug villa-mediterranea-marbella --year --guests 8
 *
 * Variables de entorno:
 *   PAYPAL_ME_USER  → tu handle PayPal.me (ej: "globalmove")
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* -------------------------------------------------------------------------
 * Property data — mirrored from src/data/properties.ts (rental only)
 *
 * Mantener sincronizado con el data source principal. Cuando el SaaS
 * esté listo, este bloque se reemplaza por fetch dinámico.
 * ----------------------------------------------------------------------- */
const PROPERTIES = [
  { slug: 'villa-mediterranea-marbella', name: { es: 'Villa Mediterránea' }, location: { es: 'Milla de Oro, Marbella' }, price: 1850, cleaningFee: 350, maxGuests: 10, transaction: 'rent' },
  { slug: 'casa-blaca-ibiza', name: { es: 'Casa Blanca Ibiza' }, location: { es: 'San José, Ibiza' }, price: 2400, cleaningFee: 450, maxGuests: 12, transaction: 'rent' },
  { slug: 'penthouse-puerto-banus', name: { es: 'Penthouse Puerto Banús' }, location: { es: 'Puerto Banús, Marbella' }, price: 1250, cleaningFee: 250, maxGuests: 8, transaction: 'rent' },
  { slug: 'finca-mallorca-pollenca', name: { es: 'Finca Pollensa' }, location: { es: 'Pollensa, Mallorca' }, price: 1450, cleaningFee: 300, maxGuests: 14, transaction: 'rent' },
  { slug: 'villa-blanca-ibiza', name: { es: 'Villa Blanca' }, location: { es: 'Sant Antoni, Ibiza' }, price: 1980, cleaningFee: 380, maxGuests: 10, transaction: 'rent' },
  { slug: 'casa-atlantico-tenerife', name: { es: 'Casa Atlántico' }, location: { es: 'Costa Adeje, Tenerife' }, price: 1680, cleaningFee: 320, maxGuests: 8, transaction: 'rent' },
];

/* -------------------------------------------------------------------------
 * CLI arg parsing
 * ----------------------------------------------------------------------- */
function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--user') out.user = args[++i];
    else if (a === '--slug') out.slug = args[++i];
    else if (a === '--nights') out.nights = parseInt(args[++i], 10);
    else if (a === '--weeks') out.weeks = parseInt(args[++i], 10);
    else if (a === '--months') out.months = parseInt(args[++i], 10);
    else if (a === '--year') out.year = true;
    else if (a === '--guests') out.guests = parseInt(args[++i], 10);
    else if (a === '--discount') out.discount = parseFloat(args[++i]);
    else if (a === '--start') out.startDate = args[++i];
    else if (a === '--monthly-rate') out.monthlyRate = parseFloat(args[++i]);
    else if (a === '--note') out.note = args[++i];
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function printHelp() {
  console.log(`
Uso: node scripts/generate-paypal-link.mjs [opciones]

Opciones:
  --user <handle>         Tu handle de PayPal.me (ej: globalmove)
                           También lee de PAYPAL_ME_USER (env var)
  --slug <slug>           Slug de la propiedad (src/data/properties.ts)

  --nights <n>             Estancia corta: n noches
  --weeks <n>              Estancia media: n semanas (×7 noches)
  --months <n>             Estancia larga: n meses (×30 noches)
  --year                   Estancia anual (365 noches)
  --start <YYYY-MM-DD>      Fecha de inicio (informativa, sale en el link)

  --guests <n>             Número de huéspedes
  --monthly-rate <€>        Override del precio mensual (para largas estancias)
  --discount <pct>         Descuento en % (ej: 10 = 10% off)
  --note <texto>           Concepto personalizado

Sin argumentos, entra en modo interactivo.

Ejemplos:
  # Reserva corta (7 noches)
  node scripts/generate-paypal-link.mjs --user globalmove \\
    --slug villa-mediterranea-marbella --nights 7 --guests 6

  # Larga estancia (3 meses)
  node scripts/generate-paypal-link.mjs --user globalmove \\
    --slug penthouse-puerto-banus --months 3 --guests 4

  # Anual
  node scripts/generate-paypal-link.mjs --user globalmove \\
    --slug mansion-marbella-venta --year --guests 8 \\
    --monthly-rate 4500
`);
}

/* -------------------------------------------------------------------------
 * Pricing model
 *
 *   Estancia corta (nights):  nights * price + cleaning
 *   Estancia media (weeks):   nights * price + cleaning
 *   Estancia larga (months):  months * monthlyRate (override o derivado)
 *   Anual (year):             12 * monthlyRate
 * ----------------------------------------------------------------------- */

function deriveMonthlyRate(property) {
  // Heurística: precio mensual ≈ price × 30 × 0.7 (descuento larga estancia)
  return Math.round(property.price * 30 * 0.7);
}

/* -------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------- */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildPayPalMeUrl({ user, amount, currency = 'EUR', note }) {
  const url = new URL(`https://paypal.me/${encodeURIComponent(user)}/${amount}/${currency}`);
  if (note) {
    url.searchParams.set('note', note);
  }
  return url.toString();
}

/* -------------------------------------------------------------------------
 * Interactive prompts
 * ----------------------------------------------------------------------- */
async function ask(question, fallback = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || fallback).trim());
    });
  });
}

function pickPropertyInteractive() {
  console.log('\nPropiedades disponibles (alquiler):');
  const slugs = PROPERTIES.filter((p) => p.transaction === 'rent').map((p) => p.slug);
  slugs.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  return ask('\nNúmero de propiedad: ').then(
    (idx) => slugs[parseInt(idx, 10) - 1] || slugs[0]
  );
}

function pickDurationInteractive() {
  console.log('\nDuración de la estancia:');
  console.log('  1. Noche(s)         — corta estancia');
  console.log('  2. Semana(s)        — media estancia');
  console.log('  3. Mes(es)          — larga estancia');
  console.log('  4. Año completo     — anual');
  return ask('\nTipo (1-4): ').then(async (opt) => {
    const o = opt || '1';
    if (o === '1') return { nights: parseInt(await ask('Número de noches: '), 10) };
    if (o === '2') return { weeks: parseInt(await ask('Número de semanas: '), 10) };
    if (o === '3') return { months: parseInt(await ask('Número de meses: '), 10) };
    return { year: true };
  });
}

async function collectInteractive() {
  if (!process.argv.includes('--user')) {
    process.env.PAYPAL_ME_USER = await ask(
      '\nTu handle de PayPal.me (ej: globalmove): ',
      process.env.PAYPAL_ME_USER || ''
    );
  }
  const user = process.env.PAYPAL_ME_USER;
  if (!user) throw new Error('Falta el handle de PayPal.me (--user o env PAYPAL_ME_USER)');

  const slug = await pickPropertyInteractive();
  const duration = await pickDurationInteractive();
  const startDate = await ask('Fecha de inicio (YYYY-MM-DD, opcional): ');
  const guests = parseInt(await ask('Número de huéspedes (default 2): ', '2'), 10);
  const discount = parseFloat(await ask('Descuento en % (default 0): ', '0')) || 0;

  let monthlyRate;
  if (duration.months || duration.year) {
    const property = PROPERTIES.find((p) => p.slug === slug);
    const defaultRate = property ? deriveMonthlyRate(property) : '?';
    monthlyRate = parseFloat(
      await ask(
        `Tarifa mensual en € (default ${defaultRate}): `,
        String(defaultRate)
      )
    );
  }

  const noteDefault =
    PROPERTIES.find((p) => p.slug === slug)?.name?.es || 'Reserva';
  const note = await ask(`Concepto para PayPal (default: "${noteDefault}"): `, noteDefault);

  return { user, slug, ...duration, startDate, guests, discount, monthlyRate, note };
}

/* -------------------------------------------------------------------------
 * Pricing calculation
 * ----------------------------------------------------------------------- */
function calculate({ property, duration, monthlyRate, discount }) {
  const nightsPerUnit = { nights: 1, weeks: 7, months: 30, year: 365 };
  const units = duration.nights ?? duration.weeks ?? duration.months ?? duration.year ? 1 : 0;
  const unit = duration.nights ? 'nights'
            : duration.weeks  ? 'weeks'
            : duration.months ? 'months'
            : duration.year   ? 'year'
            : 'nights';
  const count = duration[unit] ?? 1;
  const nights = count * nightsPerUnit[unit];

  let subtotal;
  let unitLabel;
  if (unit === 'nights' || unit === 'weeks') {
    // Corta estancia: tarifa por noche × noches
    subtotal = count * (unit === 'weeks' ? count * 7 * property.price : count * property.price);
    // El cálculo anterior es redundante — simplifico:
    subtotal = nights * property.price;
    unitLabel = unit === 'nights' ? `${count} noche${count > 1 ? 's' : ''}` : `${count} semana${count > 1 ? 's' : ''}`;
  } else {
    // Larga estancia: tarifa mensual × meses (anual = ×12)
    const rate = monthlyRate ?? deriveMonthlyRate(property);
    const months = unit === 'year' ? 12 : count;
    subtotal = months * rate;
    unitLabel = unit === 'year' ? '1 año' : `${count} mes${count > 1 ? 'es' : ''}`;
  }

  const cleaning = (unit === 'nights' || unit === 'weeks') ? (property.cleaningFee ?? 0) : 0;
  const discountAmt = Math.round(subtotal * (discount / 100));
  const total = subtotal + cleaning - discountAmt;

  return { nights, subtotal, cleaning, discountAmt, total, unitLabel };
}

/* -------------------------------------------------------------------------
 * Main
 * ----------------------------------------------------------------------- */
async function main() {
  const cliArgs = parseArgs();

  if (cliArgs.user) process.env.PAYPAL_ME_USER = cliArgs.user;

  let input;
  const hasDuration =
    cliArgs.nights || cliArgs.weeks || cliArgs.months || cliArgs.year;
  if (cliArgs.slug && hasDuration) {
    input = {
      user: cliArgs.user || process.env.PAYPAL_ME_USER,
      slug: cliArgs.slug,
      nights: cliArgs.nights,
      weeks: cliArgs.weeks,
      months: cliArgs.months,
      year: cliArgs.year,
      startDate: cliArgs.start,
      guests: cliArgs.guests || 1,
      discount: cliArgs.discount || 0,
      monthlyRate: cliArgs.monthlyRate,
      note: cliArgs.note || '',
    };
  } else {
    input = await collectInteractive();
  }

  if (!input.user) throw new Error('Falta PAYPAL_ME_USER o --user');
  const property = PROPERTIES.find((p) => p.slug === input.slug);
  if (!property) {
    console.error(`\n✗ Propiedad "${input.slug}" no encontrada.`);
    console.error(`  Slugs válidos: ${PROPERTIES.map((p) => p.slug).join(', ')}`);
    process.exit(1);
  }
  if (property.transaction !== 'rent') {
    console.error(`\n✗ "${property.slug}" es una propiedad de venta, no de alquiler.`);
    process.exit(1);
  }
  if (input.guests > property.maxGuests) {
    console.error(
      `\n✗ Capacidad máxima: ${property.maxGuests} huéspedes (pediste ${input.guests}).`
    );
    process.exit(1);
  }

  const duration = {
    nights: input.nights,
    weeks: input.weeks,
    months: input.months,
    year: input.year,
  };

  const { nights, subtotal, cleaning, discountAmt, total, unitLabel } = calculate({
    property,
    duration,
    monthlyRate: input.monthlyRate,
    discount: input.discount,
  });

  const dateRange = input.startDate
    ? ` desde ${formatDate(input.startDate)}`
    : '';
  const note =
    input.note ||
    `${property.name.es}${dateRange} · ${unitLabel}`;

  const url = buildPayPalMeUrl({
    user: input.user,
    amount: total,
    note,
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESUMEN DE RESERVA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Propiedad:   ${property.name.es}`);
  console.log(`  Ubicación:    ${property.location.es}`);
  if (input.startDate) console.log(`  Inicio:       ${formatDate(input.startDate)}`);
  console.log(`  Duración:     ${unitLabel}`);
  console.log(`  Huéspedes:    ${input.guests} / ${property.maxGuests}`);
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Subtotal:              ${subtotal.toLocaleString('es-ES')} €`);
  if (cleaning > 0) console.log(`  Limpieza:              ${cleaning.toLocaleString('es-ES')} €`);
  if (discountAmt > 0) console.log(`  Descuento (${input.discount}%):     -${discountAmt.toLocaleString('es-ES')} €`);
  console.log(`  TOTAL:                 ${total.toLocaleString('es-ES')} €`);
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Concepto PayPal:   ${note}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  🔗 LINK PAYPAL.ME:\n`);
  console.log(`  ${url}\n`);
  console.log('  (copia y pega en WhatsApp / email al cliente)\n');
}

main().catch((err) => {
  console.error(`\n✗ Error: ${err.message}\n`);
  printHelp();
  process.exit(1);
});
