import type { APIRoute } from 'astro'
import { allLocales } from '@/config'
import { sitemap } from '@/utils/sitemap'

export const GET: APIRoute = ({ site, url }) => sitemap(site ?? url, allLocales)
