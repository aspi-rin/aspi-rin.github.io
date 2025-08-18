---
title: "Hexo+Narrow Markdown Notes"
date: 2024-01-15T10:00:00+08:00
draft: true
summary: "这是一个包含各种 Markdown 语法的测试文档，用于验证文档样式的完整性。"
categories: ["test"]
tags: ["markdown", "hexo"]
katex: true
lightbox:
  enabled: true
justified_gallery:
  enabled: true
---

## 图片

### 单张图片

![示例图片](images/test.jpg "示例图片")

### Justified 布局

![https://unsplash.com/@thesaboo](images/03.avif "摄影师 - Sascha Bosshard")
![https://unsplash.com/@yusufevli](images/04.avif "摄影师 - Yusuf Evli")
![https://unsplash.com/@flovayn](images/05.avif "摄影师 - Jay Mantri")
![https://unsplash.com/@flovayn](images/06.avif "摄影师 -  Florian van Duyn")
![https://unsplash.com/@juanster](images/07.avif "摄影师 - Juan Davila")
![https://unsplash.com/@davidmarcu](images/08.avif "摄影师 - David Marcu")

### 瀑布流布局 - 短代码
<!-- 四列 -->
{{< masonry columns=4 gutter=15 >}}
![https://unsplash.com/@@tobbes_rd](images/01.avif "摄影师 - Tobias Rademacher")
![https://unsplash.com/@therawhunter](images/02.avif "摄影师 - Massimiliano Morosinotto")
![https://unsplash.com/@thesaboo](images/03.avif "摄影师 - Sascha Bosshard")
![https://unsplash.com/@yusufevli](images/04.avif "摄影师 - Yusuf Evli")
![https://unsplash.com/@flovayn](images/05.avif "摄影师 - Jay Mantri")
![https://unsplash.com/@flovayn](images/06.avif "摄影师 -  Florian van Duyn")
![https://unsplash.com/@juanster](images/07.avif "摄影师 - Juan Davila")
![https://unsplash.com/@davidmarcu](images/08.avif "摄影师 - David Marcu")
{{< /masonry >}}

## 提示框

> [!NOTE]
> 这是一个注意事项。

> [!TIP]
> 这是一个提示。

> [!IMPORTANT]
> 这是重要信息。

> [!WARNING]
> 这是一个警告。

> [!CAUTION]
> 这是一个注意事项。

## 详情

<details>
<summary>点击展开详情</summary>

这是折叠的详细内容。

你可以在这里包含任何 Markdown 语法：

- 列表项
- **粗体文本**
- `代码`

</details>

## 代码块：文件名，行号，高亮特定行

```go {filename="go.go" lineNos=true hl_lines=[3,6,8]}
package main

import "fmt"  // 这一行将被高亮

func main() {
    message := "你好，世界！"  // 这一行也将被高亮

    fmt.Println(message)  // 这一行也将被高亮

    for i := 0; i < 3; i++ {
        fmt.Printf("计数：%d\n", i)
    }
}
```