import { defineConfig } from 'astro/config';

// https://astro.build/config
// Note: i18n routing is handled manually via [locale]/ dynamic routes.
export default defineConfig({
  site: 'https://globalmove.com',
  trailingSlash: 'always',
});