import type { Language } from '@/i18n/config'
import { base } from '@/config'
import { getLangFromPath, getLangRouteParam } from '@/i18n/lang'

/**
 * Get path to a specific tag page with language support
 *
 * @param tagName Tag name
 * @param lang Current language code
 * @returns Path to tag page
 */
import { taxonomySlug } from '@/utils/taxonomy'

export function getTagPath(tagName: string, lang: Language): string {
  return getLocalizedPath(`/tags/${taxonomySlug(tagName)}/`, lang)
}

/**
 * Get path to a specific post page with language support
 *
 * @param slug Post slug
 * @param lang Current language code
 * @returns Path to post page
 */
export function getPostPath(slug: string, lang: Language): string {
  return getLocalizedPath(`/posts/${slug}/`, lang)
}

/**
 * Generate localized path based on current language
 *
 * @param path Path to localize
 * @param currentLang Current language code
 * @returns Localized path with language prefix
 */
export function getLocalizedPath(path: string, currentLang?: Language) {
  const normalizedPath = path.replace(/^\/|\/$/g, '')
  const lang = currentLang ?? getLangFromPath(path)

  const prefix = getLangRouteParam(lang)
  const segments = [prefix, normalizedPath].filter(Boolean)
  return segments.length ? `${base}/${segments.join('/')}/` : `${base}/`
}
