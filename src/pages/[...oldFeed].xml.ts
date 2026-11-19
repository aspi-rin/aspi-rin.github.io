import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { Feed } from 'feed'
import { defaultLocale, themeConfig } from '@/config'
import { langMap } from '@/i18n/config'
import { getLocalizedPath, getPostPath } from '@/i18n/path'
import { getPosts } from '@/utils/content'
import { getLegacyPath, getLegacyPostGuidPath, legacyLocales } from '@/utils/legacy'
import { taxonomySlug, termSlug } from '@/utils/taxonomy'

interface FeedEntry {
  title: string
  url: string
  old?: string
  date: Date
  description?: string
}

interface Props {
  entries: FeedEntry[]
  title: string
}

export async function getStaticPaths() {
  const feeds = new Map<string, Props>()
  const published = await getPosts(defaultLocale)
  const canonical = new Map(published.map(post => [post.data.abbrlink || post.id, post]))
  const aboutEntries = await getCollection('about', ({ data }) => data.lang === defaultLocale || data.lang === '')
  const about = aboutEntries.find(entry => entry.data.lang === defaultLocale) ?? aboutEntries[0]

  for (const lang of legacyLocales) {
    const posts = await getPosts(lang)
    const toEntries = (items: typeof posts): FeedEntry[] => items.flatMap((post) => {
      const slug = post.data.abbrlink || post.id
      const entry = canonical.get(slug)
      return entry
        ? [{
            title: entry.data.title,
            url: getPostPath(slug, defaultLocale),
            old: getLegacyPostGuidPath(post, lang),
            date: entry.data.published,
            description: entry.data.description,
          }]
        : []
    })

    const add = (path: string, entries: FeedEntry[], title = themeConfig.site.title) =>
      feeds.set(path.slice(1, -4), { entries, title })
    const news = toEntries(posts)
    const postEntries = [...news]
    if (about) {
      news.push({
        title: about.data.title,
        url: getLocalizedPath('/about/', defaultLocale),
        old: getLegacyPath(lang, '/about/'),
        date: about.data.date,
      })
      news.sort((a, b) => b.date.getTime() - a.date.getTime())
    }

    add(getLegacyPath(lang, '/index.xml'), news)
    add(getLegacyPath(lang, '/posts/index.xml'), postEntries)
    if (lang === 'ja')
      add('/ja/index.xml', news)

    for (const field of ['categories', 'tags'] as const) {
      const canonicalTerms = new Map(published.flatMap(post => post.data[field].map(term => [taxonomySlug(term), term] as const)))
      const terms = new Set(posts.flatMap(post => post.data[field]))
      const index: FeedEntry[] = []
      for (const term of terms) {
        const selected = posts.filter(post => post.data[field].includes(term))
        const slug = taxonomySlug(term)
        const label = canonicalTerms.get(slug)
        const section = field === 'categories' ? '分类' : '标签'
        const old = getLegacyPath(lang, `/${field}/${termSlug(term)}/`)
        const url = getLocalizedPath(label ? `/${field}/${slug}/` : `/${field}/`, defaultLocale)
        index.push({ title: label || section, url, old, date: selected[0].data.published })
        add(`${old}index.xml`, toEntries(selected), label || section)
      }
      add(getLegacyPath(lang, `/${field}/index.xml`), index)
    }
  }
  return [...feeds].map(([oldFeed, props]) => ({ params: { oldFeed }, props }))
}

export const GET: APIRoute<Props> = ({ props, url, site }) => {
  const { entries, title } = props
  const absolute = (route: string) => new URL(route, site ?? url).href
  const home = absolute(getLocalizedPath('/', defaultLocale))
  const feed = new Feed({
    title,
    id: home,
    link: home,
    language: langMap[defaultLocale][0],
    copyright: 'Aspi-Rin',
    feedLinks: { rss: absolute(url.pathname) },
  })
  for (const entry of entries) {
    feed.addItem({
      title: entry.title,
      link: absolute(entry.url),
      id: absolute(entry.old || entry.url),
      date: entry.date,
      description: entry.description,
    })
  }
  return new Response(feed.rss2(), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
