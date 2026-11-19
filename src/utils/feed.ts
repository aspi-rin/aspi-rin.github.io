import type { APIContext, ImageMetadata } from 'astro'
import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import { getImage } from 'astro:assets'
import { getCollection } from 'astro:content'
import { Feed } from 'feed'
import MarkdownIt from 'markdown-it'
import { parse } from 'node-html-parser'
import sanitizeHtml from 'sanitize-html'
import { allLocales, base, defaultLocale, themeConfig } from '@/config'
import { langMap } from '@/i18n/config'
import { getLangFromPath, getLangRouteParam, getLanguagePrefix } from '@/i18n/lang'
import { getLocalizedPath, getPostPath } from '@/i18n/path'
import { ui } from '@/i18n/ui'
import { memoize } from '@/utils/cache'
import { getPostDescription, getPostPreviewBody } from '@/utils/description'
import { getLegacyPostGuidPath, legacyLocales } from '@/utils/legacy'

const markdownParser = new MarkdownIt()
const { title, description, i18nTitle, url, author } = themeConfig.site
const { folo } = themeConfig.seo ?? {}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Dynamically import all images from /src/content/posts/_images
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/posts/_images/**/*.{jpeg,jpg,png,gif,webp}',
)

/**
 * Converts relative image paths to absolute URLs
 *
 * @param srcPath - Relative image path from markdown content
 * @param baseUrl - Site base URL
 * @returns Optimized image URL or null if processing fails
 */
async function _getAbsoluteImageUrl(srcPath: string, baseUrl: string) {
  // Remove relative path prefixes (../ and ./) from image source path
  const prefixRemoved = srcPath.replace(/^(?:\.\.\/)+|^\.\//, '')
  const absolutePath = `/src/content/posts/${prefixRemoved}`
  const imageImporter = imagesGlob[absolutePath]

  if (!imageImporter) {
    return null
  }

  // Import image module and extract its metadata
  const imageMetadata = await imageImporter()
    .then(importedModule => importedModule.default)
    .catch((error) => {
      console.warn(`Failed to import image: ${absolutePath}`, error)
      return null
    })

  if (!imageMetadata) {
    return null
  }

  // Create optimized image from metadata
  const optimizedImage = await getImage({ src: imageMetadata })
  return new URL(optimizedImage.src, baseUrl).toString()
}

// Export memoized version
const getAbsoluteImageUrl = memoize(_getAbsoluteImageUrl)

/**
 * Resolve relative images and article links in feed content
 *
 * @param htmlContent HTML content string
 * @param articleUrl URL of the article
 * @returns Processed HTML string with all image paths converted to absolute URLs
 */
async function resolveFeedPaths(htmlContent: string, articleUrl: string): Promise<string> {
  const htmlDoc = parse(htmlContent)
  for (const link of htmlDoc.getElementsByTagName('a')) {
    const href = link.getAttribute('href')
    if (href && /^(?:[./#]|[^:]+$)/.test(href)) {
      link.setAttribute('href', new URL(href, articleUrl).href)
    }
  }
  const images = htmlDoc.getElementsByTagName('img')
  const imagePromises = []

  for (const img of images) {
    const src = img.getAttribute('src')
    if (!src) {
      continue
    }

    imagePromises.push((async () => {
      try {
        // Skip if not a relative path to src/content/posts/_images directory
        if (!src.startsWith('./') && !src.startsWith('../') && !src.startsWith('_images/')) {
          return
        }

        // Process images from src/content/posts/_images directory
        const absoluteImageUrl = await getAbsoluteImageUrl(src, articleUrl)
        if (absoluteImageUrl) {
          img.setAttribute('src', absoluteImageUrl)
        }
      }
      catch (error) {
        console.warn(`Failed to convert relative image path to absolute URL: ${src}`, error)
      }
    })())
  }

  await Promise.all(imagePromises)

  return htmlDoc.toString()
}

/**
 * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 * Generate a feed object supporting both RSS and Atom formats
 *
 * @param options Feed generation options
 * @param options.lang Language to publish
 * @param options.sourceLang Language used by an older subscription
 * @returns A Feed instance ready for RSS or Atom output
 */
export async function generateFeed({ lang, sourceLang }: { lang?: Language, sourceLang?: Language } = {}) {
  const currentUI = ui[lang as keyof typeof ui] ?? ui[defaultLocale as keyof typeof ui] ?? {}
  const locale = lang ?? defaultLocale
  const siteURL = new URL(getLocalizedPath('/', locale), url).href

  // Create Feed instance
  const feed = new Feed({
    title: i18nTitle ? currentUI.title : title,
    description: i18nTitle ? currentUI.description : description,
    id: siteURL,
    link: siteURL,
    language: langMap[locale][0],
    copyright: `Copyright © ${new Date().getFullYear()} ${author}`,
    updated: new Date(),
    generator: 'Astro-Theme-Retypeset with Feed for Node.js',

    feedLinks: {
      rss: new URL('rss.xml', siteURL).href,
      atom: new URL('atom.xml', siteURL).href,
    },

    author: {
      name: author,
      link: `${url}${base}/`,
    },
  })

  // Filter posts by language and exclude drafts
  const posts = await getCollection(
    'posts',
    ({ data }: { data: CollectionEntry<'posts'>['data'] }) => {
      const isNotDraft = !data.draft
      const isCorrectLang = data.lang === locale || data.lang === ''

      return isNotDraft && isCorrectLang
    },
  )

  // Sort posts by published date in descending order and limit to the latest 25
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.data.published).getTime() - new Date(a.data.published).getTime())
    .slice(0, 25)

  const previousPosts = sourceLang && sourceLang !== locale
    ? await getCollection('posts', ({ data }) => data.lang === sourceLang && !data.draft)
    : []
  const previousBySlug = new Map(previousPosts.map(post => [post.data.abbrlink || post.id, post]))

  // Add posts to feed
  for (const post of recentPosts) {
    const slug = post.data.abbrlink || post.id
    const link = new URL(getPostPath(slug, locale), siteURL).href
    const previous = previousBySlug.get(slug)
    const identityLang = previous && sourceLang ? sourceLang : locale
    const guid = new URL(getLegacyPostGuidPath(previous ?? post, identityLang), siteURL).href

    // Optimize content processing
    const body = getPostPreviewBody(post.body)
    const postContent = body
      ? sanitizeHtml(
          await resolveFeedPaths(
            // Remove HTML comments before rendering markdown
            markdownParser.render(body.replace(/<!--[\s\S]*?-->/g, '')),
            link,
          ),
          {
            // Allow <img> tags in feed content
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          },
        )
      : ''

    // publishDate -> Atom:<published>, RSS:<pubDate>
    const publishDate = new Date(post.data.published)
    // updateDate -> Atom:<updated>, RSS has no update tag
    const updateDate = post.data.updated ? new Date(post.data.updated) : publishDate

    feed.addItem({
      title: post.data.title,
      id: guid,
      link,
      description: getPostDescription(post, 'feed'),
      content: postContent,
      author: [{
        name: author,
        link: `${url}${base}/`,
      }],
      published: publishDate,
      date: updateDate,
    })
  }

  // Add folo verification if available
  if (folo?.feedID && folo?.userID) {
    feed.addExtension({
      name: 'folo_challenge',
      objects: {
        feedId: folo.feedID,
        userId: folo.userID,
      },
    })
  }

  return feed
}

export function getFeedStaticPaths() {
  const prefixes = new Set([...allLocales.map(getLangRouteParam), ...legacyLocales.map(getLanguagePrefix)])
  return [...prefixes].map(lang => ({ params: { lang } }))
}

function getFeedLanguages(pathname: string) {
  const prefix = pathname.slice(base.length).split('/')[1]
  return {
    lang: getLangFromPath(pathname),
    sourceLang: legacyLocales.find(lang => getLanguagePrefix(lang) === prefix),
  }
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Generate RSS 2.0 format feed
export async function generateRSS(context: APIContext) {
  const feed = await generateFeed(getFeedLanguages(context.url.pathname))

  // Add XSLT stylesheet to RSS feed
  let rssXml = feed.rss2()
  rssXml = rssXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    `<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="${base}/feeds/rss-style.xsl" type="text/xsl"?>`,
  )

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

// Generate Atom 1.0 format feed
export async function generateAtom(context: APIContext) {
  const feed = await generateFeed(getFeedLanguages(context.url.pathname))

  // Add XSLT stylesheet to Atom feed
  let atomXml = feed.atom1()
  atomXml = atomXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    `<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="${base}/feeds/atom-style.xsl" type="text/xsl"?>`,
  )

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  })
}
