import type { APIRoute } from 'astro'
import { allLocales } from '@/config'
import { getPostPath } from '@/i18n/path'
import { getPosts } from '@/utils/content'

export const GET: APIRoute = async () => {
  const entries = (await Promise.all(allLocales.map(async (lang) => {
    const posts = await getPosts(lang)
    return posts.map(post => ({
      lang,
      title: post.data.title,
      summary: post.data.description,
      url: getPostPath(post.data.abbrlink || post.id, lang),
      text: [post.data.title, post.data.description, ...post.data.categories, ...post.data.tags, post.body].join(' ').toLowerCase(),
    }))
  }))).flat()
  return Response.json(entries)
}
