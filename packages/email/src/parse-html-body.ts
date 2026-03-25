import { parse } from 'node-html-parser'

const META_LABELS = ['Von:', 'From:', 'Betreff:', 'Subject:', 'Datum:', 'Date:', 'An:', 'To:', 'Antwort an:', 'Reply-To:']

export function parseHtmlBody(htmlBody: string): string {
  const root = parse(htmlBody)

  const blockquote = root.querySelector('blockquote[type="cite"]')
  if (!blockquote) return htmlBody

  // Remove the "Anfang der weitergeleiteten Nachricht:" div
  for (const child of blockquote.childNodes) {
    if (child.nodeType === 1) {
      const el = child as ReturnType<typeof parse>
      const text = el.text?.trim() ?? ''
      if (
        text === 'Anfang der weitergeleiteten Nachricht:' ||
        text === 'Begin forwarded message:'
      ) {
        child.remove()
        continue
      }
    }
  }

  // Remove Apple-interchange-newline br
  const appleBr = blockquote.querySelector('br.Apple-interchange-newline')
  if (appleBr) appleBr.remove()

  // Remove metadata divs (the ones containing bold labels like Von:, Betreff:, etc.)
  const divs = blockquote.querySelectorAll(':scope > div')
  for (const div of divs) {
    const bold = div.querySelector('b')
    if (bold && META_LABELS.some(label => bold.text.trim().startsWith(label.replace(':', '')))) {
      div.remove()
    }
  }

  // Remove leading <br> elements
  while (blockquote.childNodes.length > 0) {
    const first = blockquote.childNodes[0]
    if (first.nodeType === 1 && (first as ReturnType<typeof parse>).rawTagName === 'br') {
      first.remove()
    } else if (first.nodeType === 3 && first.text.trim() === '') {
      first.remove()
    } else {
      break
    }
  }

  return blockquote.innerHTML.trim()
}
