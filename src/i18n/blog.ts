import type { Language } from '@/i18n/config'
import { defaultLocale } from '@/config'

const labels = {
  zh: {
    gallery: {
      layout: '图片布局',
      image: '查看图片',
      previous: '上一张',
      next: '下一张',
      close: '关闭',
      justified: '等高',
      masonry: '瀑布流',
      grid: '网格',
    },
    archives: '归档',
    categories: '分类',
    search: '搜索',
    searchPlaceholder: '输入标题或正文关键词',
    empty: '没有找到匹配的文章',
  },
  ja: {
    gallery: {
      layout: '画像レイアウト',
      image: '画像を表示',
      previous: '前の画像',
      next: '次の画像',
      close: '閉じる',
      justified: '高さ揃え',
      masonry: 'メイソンリー',
      grid: 'グリッド',
    },
    archives: 'アーカイブ',
    categories: 'カテゴリー',
    search: '検索',
    searchPlaceholder: 'タイトルや本文のキーワードを入力',
    empty: '該当する記事がありません',
  },
  en: {
    gallery: {
      layout: 'Gallery layout',
      image: 'View image',
      previous: 'Previous image',
      next: 'Next image',
      close: 'Close',
      justified: 'Justified',
      masonry: 'Masonry',
      grid: 'Grid',
    },
    archives: 'Archives',
    categories: 'Categories',
    search: 'Search',
    searchPlaceholder: 'Search titles or article text',
    empty: 'No matching articles',
  },
}

export function blogLabels(lang: Language) {
  return labels[lang as keyof typeof labels] ?? labels[defaultLocale as keyof typeof labels]
}
