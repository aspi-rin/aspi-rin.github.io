import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import { base, defaultLocale } from '@/config'
import { getLanguagePrefix } from '@/i18n/lang'
import { getLocalizedPath, getPostPath } from '@/i18n/path'
import { getPosts } from '@/utils/content'
import { taxonomySlug, termSlug } from '@/utils/taxonomy'

export const legacyLocales = ['zh', 'ja', 'en'] as const

export function getLegacyPath(lang: Language, route: string) {
  return lang === 'ja' ? route : `/${getLanguagePrefix(lang)}${route}`
}

export function getLegacyPostPath(post: CollectionEntry<'posts'>, lang: Language) {
  return post.data.legacySlug ? getLegacyPath(lang, `/posts/${post.data.legacySlug}/`) : undefined
}

export function getLegacyPostGuidPath(post: CollectionEntry<'posts'>, lang: Language) {
  const slug = post.data.abbrlink || post.id
  return getLegacyPostPath(post, lang) ?? `${base}/${getLanguagePrefix(lang)}/posts/${slug}/`
}

export async function getLegacyRedirects() {
  const canonicalPosts = await getPosts()
  const slugs = new Set(canonicalPosts.map(post => post.data.abbrlink || post.id))
  const paths = new Map<string, string>()
  const localized = (route: string) => getLocalizedPath(route, defaultLocale)

  function add(source: string, target: string) {
    if (base + source !== target)
      paths.set(source, target)
  }

  for (const lang of legacyLocales) {
    const prefix = `/${getLanguagePrefix(lang)}`
    const posts = await getPosts(lang)
    const listings = ['/', '/about/', '/archives/', '/categories/', '/posts/', '/search/', '/tags/']

    for (const listing of listings) {
      add(prefix + listing, localized(listing))
    }

    for (const post of posts) {
      const slug = post.data.abbrlink || post.id
      const target = slugs.has(slug) ? getPostPath(slug, defaultLocale) : localized('/posts/')
      add(`${prefix}/posts/${slug}/`, target)

      const legacy = getLegacyPostPath(post, lang)
      if (legacy)
        add(legacy, target)
    }

    for (const field of ['categories', 'tags'] as const) {
      const available = new Set(canonicalPosts.flatMap(post => post.data[field].map(taxonomySlug)))
      const terms = new Set(posts.flatMap(post => post.data[field]))
      for (const term of terms) {
        const slug = taxonomySlug(term)
        const target = localized(available.has(slug) ? `/${field}/${slug}/` : `/${field}/`)
        add(`${prefix}/${field}/${slug}/`, target)
        add(getLegacyPath(lang, `/${field}/${termSlug(term)}/`), target)
      }
    }

    add(getLegacyPath(lang, '/posts/page/1/'), localized('/posts/'))
    add(`${prefix}/posts/page/1/`, localized('/posts/'))
    for (let number = 2; number <= Math.ceil(posts.length / 9); number++) {
      const listing = `/posts/page/${number}/`
      add(prefix + listing, localized(number <= Math.ceil(canonicalPosts.length / 9) ? listing : '/posts/'))
    }
  }
  return paths
}
