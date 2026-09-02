import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
// Note: i18n routing is handled manually via [locale]/ dynamic routes.
export default defineConfig({
  site: 'https://globalmove.agency',
  trailingSlash: 'always',
  integrations: [tailwind()],
});