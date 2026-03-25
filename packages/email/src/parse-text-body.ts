import { findForwardMarker } from './parse-forward-meta.js'

const META_LINE = /^(?:Von|From|Betreff|Subject|Datum|Date|An|To|Antwort an|Reply-To):\s/

export function parseTextBody(textBody: string): string {
  const found = findForwardMarker(textBody)
  if (!found) return textBody.trim()

  const afterMarker = textBody.slice(found.index + found.marker.length)
  const lines = afterMarker.split('\n')

  // Skip blank lines, then skip metadata lines, then skip blank lines again
  let i = 0
  // Skip leading blank lines
  while (i < lines.length && lines[i].trim() === '') i++
  // Skip metadata lines
  while (i < lines.length && META_LINE.test(lines[i])) i++
  // Skip blank lines after metadata
  while (i < lines.length && lines[i].trim() === '') i++

  return lines.slice(i).join('\n').trim()
}
