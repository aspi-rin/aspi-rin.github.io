# 邪神ちゃん Blog

简体中文个人博客，收录日常、旅行和技术笔记。

## 本地预览

使用 Node.js 24 和 pnpm 10.33.0。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm preview --host 0.0.0.0 --port 4322
```

## 文章

在 `content/zh-cn/posts/` 中添加 Markdown，设定 `lang: zh` 和简短的小写英文 `slug`。例如 `slug: qingdao` 会生成 `/posts/qingdao/`。正文图片和分享卡片的 `cover` 可使用 PicList 上传后返回的 R2 地址。

## 主题与版权

主题来自 [aspi-rin/reretypeset](https://github.com/aspi-rin/reretypeset/tree/a636b6d393be714cab52d3fc4baddd3f3905f701)，沿用 [MIT 许可证](LICENSE)。文章沿用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。
