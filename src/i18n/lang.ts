import type { Language } from '@/i18n/config'
import { allLocales, base, defaultLocale } from '@/config'

export function getLanguagePrefix(lang: Language): string {
  return lang === 'zh' ? 'zh-cn' : lang
}

export function getLangRouteParam(lang: Language): string | undefined {
  return allLocales.length > 1 ? getLanguagePrefix(lang) : undefined
}

export function getLangFromPath(path: string): Language {
  const firstSegment = path.slice(base.length).split('/')[1]
  return allLocales.find(lang => getLangRouteParam(lang) === firstSegment) ?? defaultLocale
}

export function getPathWithinLocale(path: string) {
  const relative = path.slice(base.length)
  const [, prefix, ...rest] = relative.split('/')
  return allLocales.some(lang => getLangRouteParam(lang) === prefix) ? `/${rest.join('/')}` : relative
}
