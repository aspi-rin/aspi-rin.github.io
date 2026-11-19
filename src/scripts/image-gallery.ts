function sizeRows(items: HTMLElement) {
  const width = items.clientWidth
  if (!width)
    return

  const gap = Number.parseFloat(getComputedStyle(items).columnGap)
  const targetHeight = width < 480 ? 145 : 220
  let row: { figure: HTMLElement, ratio: number }[] = []
  let rowRatio = 0

  function sizeRow(fill: boolean) {
    if (!row.length)
      return
    const height = (width - gap * (row.length - 1)) / rowRatio
    for (const { figure, ratio } of row) {
      const imageHeight = fill ? height : Math.min(height, targetHeight)
      figure.style.setProperty('--justified-width', `${Math.floor(imageHeight * ratio)}px`)
    }
    row = []
    rowRatio = 0
  }

  for (const figure of items.querySelectorAll<HTMLElement>('.article-image')) {
    const image = figure.querySelector('img')!
    const ratio = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1.5
    row.push({ figure, ratio })
    rowRatio += ratio
    if (rowRatio * targetHeight + gap * (row.length - 1) >= width)
      sizeRow(true)
  }
  sizeRow(false)
}

export function setupImageGalleries() {
  const template = document.querySelector<HTMLTemplateElement>('#image-layout-controls')
  if (!template)
    return

  const widths = new WeakMap<Element, number>()
  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (widths.get(target) === contentRect.width)
        continue
      widths.set(target, contentRect.width)
      if (target.parentElement?.dataset.layout === 'justified')
        sizeRows(target as HTMLElement)
    }
  })

  for (const gallery of document.querySelectorAll<HTMLElement>('.image-gallery')) {
    const items = gallery.querySelector<HTMLElement>('.image-gallery-items')!
    const toolbar = template.content.cloneNode(true) as DocumentFragment
    const buttons = toolbar.querySelectorAll<HTMLButtonElement>('button')
    gallery.prepend(toolbar)
    gallery.dataset.layout = 'justified'
    sizeRows(items)
    observer.observe(items)

    items.addEventListener('load', () => {
      if (gallery.dataset.layout === 'justified')
        sizeRows(items)
    }, true)

    for (const button of buttons) {
      button.addEventListener('click', () => {
        gallery.dataset.layout = button.dataset.layout
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
        if (gallery.dataset.layout === 'justified')
          sizeRows(items)
      })
    }
  }

  return () => observer.disconnect()
}
