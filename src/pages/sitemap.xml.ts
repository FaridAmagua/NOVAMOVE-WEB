import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getProperties } from '../data/property-source';
import { supportedLocales, type Locale } from '../utils/i18n';

export const prerender = true;

const staticRoutes = [
  '/',
  '/services/',
  '/destinations/',
  '/properties/',
  '/about/',
  '/blog/',
  '/contact/',
];

const isoDate = (value?: string | Date) => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const urlEntry = (loc: string, lastmod?: string | Date, priority = '0.7') => `  <url>
    <loc>${loc}</loc>
    <lastmod>${isoDate(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://globalmove.agency');
  const urls: string[] = [];

  for (const locale of supportedLocales) {
    for (const route of staticRoutes) {
      const priority = route === '/' ? '1.0' : route === '/properties/' ? '0.9' : '0.7';
      urls.push(urlEntry(new URL(`/${locale}${route === '/' ? '/' : route}`, base).toString(), undefined, priority));
    }
  }

  const [{ properties }, posts] = await Promise.all([
    getProperties(),
    getCollection('blog'),
  ]);

  for (const locale of supportedLocales) {
    for (const property of properties) {
      urls.push(urlEntry(
        new URL(`/${locale}/properties/${property.slug}/`, base).toString(),
        property.updatedAt,
        property.featured ? '0.9' : '0.8'
      ));
    }
  }

  for (const post of posts) {
    const locale = post.data.locale as Locale;
    const slug = post.slug.replace(/[-.](es|en)$/, '');
    urls.push(urlEntry(
      new URL(`/${locale}/blog/${slug}/`, base).toString(),
      post.data.publishDate,
      post.data.featured ? '0.8' : '0.6'
    ));
  }

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
