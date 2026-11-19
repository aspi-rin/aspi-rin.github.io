import type { Language } from '@/i18n/config'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import { themeConfig } from '@/config'
import { langMap } from '@/i18n/config'

const contentLanguages = Object.keys(langMap) as Language[]

const posts = defineCollection({
  loader: glob({
    pattern: '*/posts/**/*.{md,mdx}',
    base: './content',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
  }),
  schema: z.preprocess((value) => {
    if (!value || typeof value !== 'object')
      return value
    const data = value as Record<string, unknown>
    return {
      ...data,
      published: data.published ?? data.date,
      description: data.description ?? data.summary,
      abbrlink: data.abbrlink ?? data.slug,
    }
  }, z.object({
    // required
    title: z.string(),
    published: z.coerce.date(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.date().optional(),
    ),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    cover: z.string().optional(),
    legacySlug: z.string().optional(),
    showLicense: z.boolean().default(true),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(themeConfig.global.toc),
    lang: z.enum(['', ...contentLanguages]).optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  })),
})

const about = defineCollection({
  loader: glob({ pattern: '*/about.md', base: './content' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    links: z.array(z.object({ name: z.string(), url: z.url(), description: z.string() })).default([]),
    lang: z.enum(['', ...contentLanguages]).optional().default(''),
  }),
})

export const collections = { posts, about }
