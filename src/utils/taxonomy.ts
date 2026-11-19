export function termSlug(term: string) {
  return term
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
}

const englishTerms: Record<string, string> = {
  日常: 'daily-life',
  二次元: 'anime',
  展览: 'exhibition',
  展示会: 'exhibition',
  手办: 'figures',
  フィギュア: 'figures',
  爱媛: 'ehime',
  愛媛: 'ehime',
  北海道: 'hokkaido',
  富士山: 'mount-fuji',
  年终总结: 'year-end-review',
  年末振り返り: 'year-end-review',
  摄影: 'photography',
  写真: 'photography',
  游记: 'travel-journal',
  Travel: 'travel-journal',
  Travelogue: 'travel-journal',
  旅行記: 'travel-journal',
  环境配置: 'environment-setup',
  環境設定: 'environment-setup',
  扩散模型: 'diffusion-model',
  拡散モデル: 'diffusion-model',
  画像生成: 'image-generation',
  镰仓: 'kamakura',
  鎌倉: 'kamakura',
  青岛: 'qingdao',
  青島: 'qingdao',
  俄罗斯: 'russia',
  ロシア: 'russia'
};

export function taxonomySlug(term: string) {
  return englishTerms[term] ?? termSlug(term);
}
