import type { APIContext } from 'astro'
import { generateRSS, getFeedStaticPaths } from '@/utils/feed'

export const getStaticPaths = getFeedStaticPaths

export async function GET(context: APIContext) {
  return generateRSS(context)
}
