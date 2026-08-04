# Global Move · Relocation & Rentals

Web bilingüe (ES/EN) de la empresa **Global Move** — servicios premium de relocation, alquileres vacacionales y venta de propiedades de alta gama en España.

Built with **Astro 4 + TypeScript**, deployed on **Netlify** with two serverless functions for the Redsys payment integration.

---

## 🚀 Quick start

```bash
npm install
npm run dev        # http://localhost:4321  (Astro dev server)
# or, after build:
npm run build
npx serve dist -l 3000   # production build, no dev-server quirks
```

## 📁 Project structure

```
src/
├── components/         # Astro components (Header, Footer, Lightbox, ...)
├── content/blog/      # Markdown articles with i18n slugs
├── data/properties.ts  # Property catalogue (rent + sale)
├── i18n/{es,en}.json  # All UI translations
├── layouts/           # BaseLayout (HTML shell, header, footer)
├── pages/             # Routes ([locale]/* + root + 404)
├── scripts/enhance.ts # Client-side enhance (animations, IO, lightbox)
├── styles/global.css  # Design system + resets
└── utils/i18n.ts      # t() helper + localizedPath()

netlify/
├── functions/
│   ├── create-payment.ts     # POST /api/create-payment → Redsys session
│   └── redsys-notification.ts # Webhook (server-to-server)
└── toml       # Netlify build + functions config
```

## ✨ Features

- **Astro 4 + TypeScript** strict mode
- **i18n** with `[locale]` dynamic routes (ES/EN)
- **58 static pages** built in ~3s
- **Properties** with rent/sale transaction types, lightbox gallery, inline datepicker with live price calculation, reviews section
- **Animations**: View Transitions API, scroll reveals with 5 variants, magnetic CTAs, 3D tilt cards, parallax, Ken Burns hero, animated counters, scroll progress bar, grain overlay
- **Redsys payment integration** via 2 serverless functions
- **Custom brand assets** (Logo with light/dark variants)
- **Typography**: Montserrat (modern sans, SERHANT-style)
- **Accessibility**: aria-labels, focus-visible, reduced-motion, semantic HTML

## 🔧 Configuration

### `astro.config.mjs`
- `trailingSlash: 'always'` — all routes use trailing slash
- `site: 'https://globalmove.com'` — change to your production domain

### `netlify.toml`
- Build: `npm run build` → `dist/`
- Functions: `netlify/functions/` (timeout 10s each)
- API redirect: `/api/*` → `/.netlify/functions/:splat`

### Environment variables (Netlify dashboard)

For Redsys integration:

| Variable | Description | Example |
|----------|-------------|---------|
| `REDSYS_MERCHANT_CODE` | Your FUC (9 digits) | `999008881` |
| `REDSYS_TERMINAL` | Terminal number | `1` |
| `REDSYS_SECRET_KEY` | Base64 secret from Redsys | `sq7HjrUOBfKmC576ILgskD5srU870gJ7` |
| `REDSYS_ENV` | Sandbox or production | `test` or `prod` |
| `SITE_URL` | Production base URL | `https://globalmove.com` |

Without these, the booking flow works in dev (with sandbox credentials) but fails in production until you set them.

## 🌍 Adding new content

### New blog post
1. Create `src/content/blog/{slug}.es.md` and `src/content/blog/{slug}.en.md`
2. Use frontmatter:
   ```yaml
   ---
   slug: "{slug}-es"   # unique per locale (include -es/-en)
   title: "..."
   description: "..."
   publishDate: 2026-01-01
   author: "Name — Role"
   category: "guides" | "destinations" | "legal" | "lifestyle"
   locale: "es" | "en"
   cover: "https://images.unsplash.com/..."
   coverAlt: "..."
   readTime: 5
   featured: false
   ---
   ```
3. Run `npm run build` — post appears in `/es/blog/` and `/en/blog/`

### New property
1. Edit `src/data/properties.ts`
2. Add entry with `slug`, `name.{es,en}`, `description.{es,en}`, `price`, `transaction: 'rent' | 'sale'`, `images: string[]` (Unsplash URLs), etc.
3. Optionally add `reviews: Review[]` for testimonials

### New translation key
1. Add to both `src/i18n/es.json` and `src/i18n/en.json`
2. Use in component: `{t(locale, 'section.key')}`

## 🚢 Deployment

Connected to Netlify via GitHub. Every push to `main` triggers an automatic deploy.

Manual preview:
```bash
netlify deploy --prod
```

## 📜 License

Proprietary — © Global Move {year}
