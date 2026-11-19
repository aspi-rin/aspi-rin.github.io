import { getLangFromPath, getPathWithinLocale } from '@/i18n/lang'
import { getLocalizedPath } from '@/i18n/path'

function matchPageType(path: string, prefix = '') {
  const relative = getPathWithinLocale(path).replace(/^\/|\/$/g, '')
  return prefix === '' ? relative === '' : relative === prefix || relative.startsWith(`${prefix}/`)
}

export function isHomePage(path: string) {
  return matchPageType(path)
}

export function isPostPage(path: string) {
  return matchPageType(path, 'posts')
}

export function isTagPage(path: string) {
  return matchPageType(path, 'tags')
}

export function isAboutPage(path: string) {
  return matchPageType(path, 'about')
}

// Returns page context with language, page types and localization helper
export function getPageInfo(path: string) {
  const currentLang = getLangFromPath(path)
  const isHome = isHomePage(path)
  const isPost = isPostPage(path)
  const isTag = isTagPage(path)
  const isAbout = isAboutPage(path)

  return {
    currentLang,
    isHome,
    isPost,
    isTag,
    isAbout,
    getLocalizedPath: (targetPath: string) =>
      getLocalizedPath(targetPath, currentLang),
  }
}
