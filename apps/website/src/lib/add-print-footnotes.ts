import { parse } from 'node-html-parser'

const SKIP_PROTOCOL_RE = /^(tel|javascript):/i
const SCHEME_PREFIX_RE = /^[a-z][a-z0-9+\-.]*:(?:\/\/)?/i

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripScheme(href: string): string {
  return href.replace(SCHEME_PREFIX_RE, '')
}

/**
 * Append numbered print-only footnote markers ([1], [2], …) after each link
 * and a "Quellen" list at the end of the HTML. Both are hidden on screen via
 * the `print-only` class and only become visible in @media print.
 *
 * Numbering is local to the HTML fragment — each block has its own list.
 */
export function addPrintFootnotes(html: string): string {
  if (!html) return html

  const root = parse(html)
  const anchors = root.querySelectorAll('a[href]')
  const indexByHref = new Map<string, number>()
  const ordered: string[] = []

  for (const anchor of anchors) {
    const raw = anchor.getAttribute('href')?.trim()
    if (!raw || raw.startsWith('#') || SKIP_PROTOCOL_RE.test(raw)) continue

    let index = indexByHref.get(raw)
    if (index === undefined) {
      ordered.push(raw)
      index = ordered.length
      indexByHref.set(raw, index)
    }

    const parent = anchor.parentNode
    if (!parent) continue
    const fragment = parse(
      ` <span class="print-only print-footnote-ref">[${index}]</span>`
    )
    const anchorIdx = parent.childNodes.indexOf(anchor)
    parent.childNodes.splice(anchorIdx + 1, 0, ...fragment.childNodes)
  }

  if (ordered.length === 0) return root.toString()

  const items = ordered
    .map((url, i) => {
      const safeHref = escapeHtml(url)
      const safeLabel = escapeHtml(stripScheme(url))
      return `<dt style="text-align:right;margin:0;">[${i + 1}]</dt><dd style="margin:0;"><a href="${safeHref}">${safeLabel}</a></dd>`
    })
    .join('')

  const list = `<div class="print-only print-footnotes"><h2>Fußnoten / Verweise</h2><dl style="display:grid;grid-template-columns:auto 1fr;column-gap:0.5em;row-gap:0.25rem;margin:0;">${items}</dl></div>`

  return root.toString() + list
}
