import type { APIRoute } from 'astro'
import { allLocales } from '@/config'
import { getLanguagePrefix } from '@/i18n/lang'
import { legacyLocales } from '@/utils/legacy'
import { sitemap } from '@/utils/sitemap'

export const getStaticPaths = () => legacyLocales.map(lang => ({ params: { lang: getLanguagePrefix(lang) } }))

export const GET: APIRoute = ({ site, url }) => sitemap(site ?? url, allLocales)
