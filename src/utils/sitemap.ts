import type { Language } from '@/i18n/config'
import { getLocalizedPath, getPostPath } from '@/i18n/path'
import { getPosts } from '@/utils/content'
import { taxonomySlug } from '@/utils/taxonomy'

export async function sitemap(site: URL, langs: Language[]) {
  const urls = (await Promise.all(langs.map(async (lang) => {
    const posts = await getPosts(lang)
    return [
      ...['/', '/posts/', '/archives/', '/categories/', '/tags/', '/about/', '/search/']
        .map(path => getLocalizedPath(path, lang)),
      ...posts.map(post => getPostPath(post.data.abbrlink || post.id, lang)),
      ...(['tags', 'categories'] as const).flatMap(field =>
        [...new Set(posts.flatMap(post => post.data[field]))]
          .map(term => getLocalizedPath(`/${field}/${taxonomySlug(term)}/`, lang))),
    ]
  }))).flat()
  const entries = urls.map(path => `<url><loc>${new URL(path, site).href}</loc></url>`)
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8' } },
  )
}
