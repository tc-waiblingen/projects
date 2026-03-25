import type { OriginalEmailMeta, EmailContact } from './types.js'

// Apple Mail forwarding markers
const FORWARD_MARKERS = [
  'Anfang der weitergeleiteten Nachricht:',
  'Begin forwarded message:',
]

// Metadata field patterns (German / English)
const FIELD_PATTERNS: Record<string, RegExp> = {
  from: /^(?:Von|From):\s*(.+)$/m,
  subject: /^(?:Betreff|Subject):\s*(.+)$/m,
  date: /^(?:Datum|Date):\s*(.+)$/m,
  to: /^(?:An|To):\s*(.+)$/m,
  replyTo: /^(?:Antwort an|Reply-To):\s*(.+)$/m,
}

function parseContact(raw: string): EmailContact {
  // "Name <email>" or "<email>" or "email"
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  const emailOnly = raw.replace(/^<|>$/g, '').trim()
  return { name: '', email: emailOnly }
}

export function findForwardMarker(text: string): { marker: string; index: number } | null {
  for (const marker of FORWARD_MARKERS) {
    const index = text.indexOf(marker)
    if (index !== -1) {
      return { marker, index }
    }
  }
  return null
}

export function parseForwardMeta(textBody: string): OriginalEmailMeta | null {
  const found = findForwardMarker(textBody)
  if (!found) return null

  // Extract the metadata block (lines between the marker and the first blank line after metadata)
  const afterMarker = textBody.slice(found.index + found.marker.length)
  // Metadata block: skip leading blank lines, then grab until a blank line follows
  const metaBlockMatch = afterMarker.match(/\n\n((?:(?:Von|From|Betreff|Subject|Datum|Date|An|To|Antwort an|Reply-To):.*\n?)+)/)
  if (!metaBlockMatch) return null

  const metaBlock = metaBlockMatch[1]

  const fields: Record<string, string> = {}
  for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = metaBlock.match(pattern)
    if (match) {
      fields[key] = match[1].trim()
    }
  }

  if (!fields.from) return null

  return {
    from: parseContact(fields.from),
    subject: fields.subject ?? '',
    date: fields.date ?? '',
    to: (fields.to ?? '').replace(/^<|>$/g, ''),
    replyTo: fields.replyTo,
  }
}
