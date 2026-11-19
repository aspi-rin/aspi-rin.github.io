import type { APIContext } from 'astro'
import { generateAtom, getFeedStaticPaths } from '@/utils/feed'

export const getStaticPaths = getFeedStaticPaths

export async function GET(context: APIContext) {
  return generateAtom(context)
}
