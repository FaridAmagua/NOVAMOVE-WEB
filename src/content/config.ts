import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().default('Global Move'),
    category: z.enum(['guides', 'destinations', 'legal', 'lifestyle']),
    locale: z.enum(['es', 'en']),
    cover: z.string().url().optional(),
    coverAlt: z.string().optional(),
    readTime: z.number().int().positive().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };