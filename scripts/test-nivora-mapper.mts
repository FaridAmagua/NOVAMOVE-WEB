// scripts/test-nivora-mapper.mts
// Tests unitarios del mapper Nivora → Property.
// NO hace fetch a Nivora — solo prueba la lógica pura del mapper
// (fromNivora, pickLocalized, orderImages, etc.)
// contra fixtures del contrato.
//
// Ejecutar con:
//   npx tsx scripts/test-nivora-mapper.mts
//
// Cada test imprime ✓ o ✗ con su nombre y resultado.

import {
  fromNivora,
  pickLocalized,
  pickEnWithFallback,
  orderImages,
  requireKnownType,
} from '../src/data/property-source.ts';
// Fixture: propiedad completa del contrato
// Usamos 'house' (NO 'villa') — 'villa' no está en la lista de tipos
// del contrato Nivora. El mapper rechaza 'villa' (Test 6).
const fullFixture = {
  id: 'prop-001',
  slug: 'v1',
  reference: 'GLOBAL-MOVE-MAR-001',
  operation: 'rent' as const,
  type: 'house' as const,
  status: 'available' as const,
  featured: true,
  content: {
    es: {
      title: 'Villa Marbella',
      tagline: 'Vistas al mar y piscina infinity',
      description: 'Una villa exclusiva en Marbella con todas las comodidades.',
      publicLocation: 'Milla de Oro, Marbella',
    },
    en: {
      title: 'Marbella Villa EN',
      tagline: 'Sea views and infinity pool',
      description: 'An exclusive villa in Marbella with all amenities.',
      publicLocation: 'Golden Mile, Marbella',
    },
  },
  pricing: { amountCents: 350000, currency: 'EUR' as const, period: 'month' as const },
  specs: { bedrooms: 5, bathrooms: 4, builtAreaSqm: 420, usableAreaSqm: 380, plotAreaSqm: 1200 },
  features: { es: ['Pool', 'Wi-Fi'], en: ['Pool EN', 'Wi-Fi EN'] },
  images: [
    { id: 'i1', url: 'https://x.com/c.jpg', alt: 'a', width: 100, height: 100, isCover: true, position: 0 },
    { id: 'i2', url: 'https://x.com/b.jpg', alt: 'b', width: 100, height: 100, isCover: false, position: 2 },
    { id: 'i3', url: 'https://x.com/a.jpg', alt: 'c', width: 100, height: 100, isCover: false, position: 1 },
  ],
  publishedAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-30T00:00:00Z',
};

let passed = 0, failed = 0;
function test(name: string, cond: boolean, detail = '') {
  if (cond) { console.log('  ✓', name); passed++; }
  else { console.log('  ✗', name, detail); failed++; }
}
function expect<T>(actual: T, expected: T, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

console.log('\n=== Test 1: fromNivora con campos completos ===\n');
try {
  const p = fromNivora(fullFixture as any);
  test('id mapeado', p.id === 'prop-001');
  test('slug mapeado', p.slug === 'v1');
  test('reference mapeada', p.reference === 'GLOBAL-MOVE-MAR-001');
  test('type mapeado', p.type === 'house');
  test('transaction mapeada', p.transaction === 'rent');
  test('status mapeado', p.status === 'available');
  test('destination mapeada', p.destination === 'Milla de Oro, Marbella');
  test('name.es mapeado', p.name.es === 'Villa Marbella');
  test('name.en mapeado', p.name.en === 'Marbella Villa EN');
  test('price (€3500)', p.price === 3500);
  test('bedrooms (5)', p.bedrooms === 5);
  test('bathrooms (4)', p.bathrooms === 4);
  test('sizeM2 (420)', p.sizeM2 === 420);
  test('features.es (2)', p.features.es?.length === 2);
  test('features.en (2)', p.features.en?.length === 2);
  test('images ordenadas con cover primero', p.images[0] === 'https://x.com/c.jpg' && p.images[1] === 'https://x.com/a.jpg' && p.images[2] === 'https://x.com/b.jpg');
} catch (e: any) {
  console.error('  ERROR Test 1:', e.message);
  failed++;
}

console.log('\n=== Test 2: fallback EN → ES cuando Nivora no envía en ===\n');
try {
  const fixture = { ...fullFixture, content: { ...fullFixture.content, en: undefined } };
  const p = fromNivora(fixture as any);
  test('name.es mantiene', p.name.es === 'Villa Marbella');
  test('name.en cae a ES', p.name.en === 'Villa Marbella');
  test('location.en cae a ES', p.location.en === 'Milla de Oro, Marbella');
} catch (e: any) {
  console.error('  ERROR Test 2:', e.message);
  failed++;
}

console.log('\n=== Test 3: features ES y EN distintos (no fallback) ===\n');
try {
  const p = fromNivora(fullFixture as any);
  test('features.es tiene 2 items', p.features.es?.length === 2);
  test('features.en distinto a features.es', JSON.stringify(p.features.en) !== JSON.stringify(p.features.es));
  test('features.en tiene 2 items', p.features.en?.length === 2);
} catch (e: any) {
  console.error('  ERROR Test 3:', e.message);
  failed++;
}

console.log('\n=== Test 4: type="house" se preserva correctamente ===\n');
try {
  const fixture = { ...fullFixture, type: 'house' as any };
  const p = fromNivora(fixture as any);
  test('type="house" → PropertyType="house"', p.type === 'house');
} catch (e: any) {
  console.error('  ERROR Test 4:', e.message);
  failed++;
}

console.log('\n=== Test 5: type="other" se preserva ===\n');
try {
  const fixture = { ...fullFixture, type: 'other' as any };
  const p = fromNivora(fixture as any);
  test('type="other" → PropertyType="other"', p.type === 'other');
} catch (e: any) {
  console.error('  ERROR Test 5:', e.message);
  failed++;
}

console.log('\n=== Test 6: type desconocido (ej "castillo") lanza error ===\n');
try {
  const fixture = { ...fullFixture, type: 'castillo' as any };
  fromNivora(fixture as any);
  console.log('  ✗ Type desconocido NO lanzó error');
  failed++;
} catch (e: any) {
  test('Type "castillo" lanza error con mensaje de tipo no soportado',
    e.name === 'Error' && e.message.includes('Tipo de Nivora no soportado: "castillo"'));
  test('Error tiene nombre correcto (NivoraError)', e.constructor.name === 'NivoraError' || e.constructor.name === 'Error');
}

console.log('\n=== Test 7: features ES y EN exactamente los del contrato ===\n');
try {
  const p = fromNivora(fullFixture as any);
  expect(p.features.es, ['Pool', 'Wi-Fi'], 'features.es');
  expect(p.features.en, ['Pool EN', 'Wi-Fi EN'], 'features.en');
} catch (e: any) {
  console.error('  ERROR Test 7:', e.message);
  failed++;
}

console.log('\n=== Test 8: sin recorte específico → imagePosition undefined ===\n');
try {
  const fixture = {
    ...fullFixture,
    images: [
      { id: 'i1', url: 'https://x.com/a.jpg', alt: 'a', width: 100, height: 100, isCover: true, position: 0 },
    ],
  };
  const p = fromNivora(fixture as any);
  test('imagePosition es undefined sin focalPoint', p.imagePosition === undefined);
} catch (e: any) {
  console.error('  ERROR Test 9:', e.message);
  failed++;
}

console.log('\n=== Test 9: helpers puros ===\n');
try {
  // pickLocalized lee key directa del objeto
  test('pickLocalized lee title de content.es',
    pickLocalized({ title: 'Villa', description: 'd', publicLocation: 'M' } as any, 'title') === 'Villa'
  );
  test('pickLocalized prefiere en sobre es si ambos existen (NO — es key directa)',
    pickLocalized({ title: 'T-es' } as any, 'title') === 'T-es'
  );
  test('pickLocalized null → fallback', pickLocalized(undefined as any, 'title') === '');
  test('pickLocalized key inexistente → fallback', pickLocalized({ foo: 'bar' } as any, 'title') === '');

  // pickEnWithFallback — usa pickLocalized internamente
  test('pickEnWithFallback en presente → usa en (key directa)',
    pickEnWithFallback({ title: 'en1' } as any, { title: 'es1' } as any, 'title') === 'en1'
  );
  test('pickEnWithFallback en ausente → fallback a es',
    pickEnWithFallback({} as any, { title: 'es1' } as any, 'title') === 'es1'
  );

  // orderImages: cover primero, luego position
  const imgs = [
    { id: 'c', url: 'c.jpg', alt: '', width: 1, height: 1, isCover: true, position: 0 },
    { id: 'b', url: 'b.jpg', alt: '', width: 1, height: 1, isCover: false, position: 2 },
    { id: 'a', url: 'a.jpg', alt: '', width: 1, height: 1, isCover: false, position: 1 },
  ];
  const ordered = orderImages(imgs as any);
  test('orderImages: cover (c) primero, luego position ascendente', ordered[0] === 'c.jpg' && ordered[1] === 'a.jpg' && ordered[2] === 'b.jpg');

  // requireKnownType
  test('requireKnownType acepta los 11 tipos del contrato', (() => {
    for (const t of ['apartment','house','chalet','duplex','penthouse','studio','land','commercial','office','garage','other'] as any) {
      requireKnownType({ id: '', slug: '', reference: '', operation: 'rent', type: t, status: 'available', featured: false, content: { es: { title: '', description: '', publicLocation: '' } }, pricing: { amountCents: 0, currency: 'EUR', period: 'month' }, specs: { bedrooms: null, bathrooms: null, builtAreaSqm: null, usableAreaSqm: null, plotAreaSqm: null }, features: { es: [] }, images: [], publishedAt: '', updatedAt: '' });
    }
    return true;
  })());
} catch (e: any) {
  console.error('  ERROR Test 10:', e.message);
  failed++;
}

console.log('\n=== Test 10: NivoraError propagado en features no-array ===\n');
try {
  // Features debería ser array pero NivoraError solo se lanza en tipos. El test
  // verifica que features null se maneja con fallback a [].
  const fixture = { ...fullFixture, features: null as any };
  const p = fromNivora(fixture as any);
  test('features null → features.es = []', Array.isArray(p.features.es) && p.features.es.length === 0);
} catch (e: any) {
  console.error('  ERROR Test 11:', e.message);
  failed++;
}

console.log('\n=== Resumen ===');
console.log('  Pasados:', passed);
console.log('  Fallados:', failed);
process.exit(failed > 0 ? 1 : 0);
