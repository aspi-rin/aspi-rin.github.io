function element(tagName, properties, children) {
  return { type: 'element', tagName, properties, children }
}

function whitespace(node) {
  return node.type === 'text' && !node.value.trim()
}

function imagesIn(node) {
  if (node.type !== 'element' || node.tagName !== 'p')
    return []
  const children = node.children.filter(child => !whitespace(child))
  return children.every(child => child.type === 'element' && child.tagName === 'img') ? children : []
}

function createFigure(image) {
  image.properties.loading ??= 'lazy'
  image.properties.decoding ??= 'async'
  const { alt, title } = image.properties
  const caption = title || (alt && !alt.startsWith('_') ? alt : '')
  const children = [
    element('a', { className: ['image-trigger'], dataAstroReload: true, dataAstroPrefetch: 'false' }, [image]),
  ]

  if (caption) {
    children.push(element('figcaption', {}, [{ type: 'text', value: caption }]))
  }

  return element('figure', { className: ['article-image'] }, children)
}

function groupImages(parent) {
  if (!parent.children)
    return
  const children = []
  let images = []

  function flushImages() {
    if (!images.length)
      return
    const figures = images.map(createFigure)
    children.push(figures.length === 1
      ? figures[0]
      : element('div', { className: ['image-gallery'] }, [
          element('div', { className: ['image-gallery-items'] }, figures),
        ]))
    images = []
  }

  for (const node of parent.children) {
    const paragraphImages = imagesIn(node)
    if (paragraphImages.length) {
      images.push(...paragraphImages)
    }
    else if (!images.length || !whitespace(node)) {
      flushImages()
      groupImages(node)
      children.push(node)
    }
  }
  flushImages()
  parent.children = children
}

export function rehypeImageProcessor() {
  return groupImages
}
