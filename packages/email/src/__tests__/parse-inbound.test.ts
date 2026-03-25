import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { parseInboundEmail } from '../index.js'
import { parseForwardMeta } from '../parse-forward-meta.js'
import { parseTextBody } from '../parse-text-body.js'
import { parseHtmlBody } from '../parse-html-body.js'
import { textToMarkdown } from '../text-to-markdown.js'
import type { PostmarkInboundPayload } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturePath = resolve(__dirname, '../../fixtures/postmark-apple-mail-macos-forward.json')
const payload: PostmarkInboundPayload = JSON.parse(readFileSync(fixturePath, 'utf-8'))

describe('parseForwardMeta', () => {
  it('extracts original sender from forwarding header', () => {
    const meta = parseForwardMeta(payload.TextBody)
    expect(meta).not.toBeNull()
    expect(meta!.from.email).toBe('no-reply@liga.nu')
    expect(meta!.from.name).toBe('WTB Ressort VI Bezirke')
  })

  it('extracts subject', () => {
    const meta = parseForwardMeta(payload.TextBody)
    expect(meta!.subject).toBe('Spielerverlegungen "Sonderregelung Damen 40/Herren 40" - Bezirk B')
  })

  it('extracts date', () => {
    const meta = parseForwardMeta(payload.TextBody)
    expect(meta!.date).toBe('25. März 2026 um 07:56:23 MEZ')
  })

  it('extracts to', () => {
    const meta = parseForwardMeta(payload.TextBody)
    expect(meta!.to).toBe('thomas.siebers@tc-waiblingen.de')
  })

  it('extracts reply-to', () => {
    const meta = parseForwardMeta(payload.TextBody)
    expect(meta!.replyTo).toBeDefined()
    expect(meta!.replyTo).toContain('naegele@wtb-tennis.de')
  })

  it('returns null for text without forwarding marker', () => {
    const meta = parseForwardMeta('Just a regular email body')
    expect(meta).toBeNull()
  })
})

describe('parseTextBody', () => {
  it('strips forwarding header and metadata', () => {
    const body = parseTextBody(payload.TextBody)
    expect(body).not.toContain('Anfang der weitergeleiteten Nachricht')
    expect(body).not.toContain('Von:')
    expect(body).not.toContain('Betreff:')
    expect(body).toMatch(/^\[WTB Newsletter\]/)
  })

  it('preserves the actual email content', () => {
    const body = parseTextBody(payload.TextBody)
    expect(body).toContain('SONDERREGELUNG DAMEN 40/HERREN 40')
    expect(body).toContain('Bezirk B (Kocher-Rems-Murr)')
  })

  it('returns original text if no forwarding marker', () => {
    const body = parseTextBody('Just plain text')
    expect(body).toBe('Just plain text')
  })
})

describe('parseHtmlBody', () => {
  it('strips blockquote wrapper and metadata divs', () => {
    const html = parseHtmlBody(payload.HtmlBody)
    expect(html).not.toContain('Anfang der weitergeleiteten Nachricht')
    expect(html).not.toContain('<b>Von:')
    expect(html).not.toContain('<b>Betreff:')
  })

  it('preserves the newsletter content', () => {
    const html = parseHtmlBody(payload.HtmlBody)
    expect(html).toContain('SONDERREGELUNG DAMEN 40/HERREN 40')
    expect(html).toContain('Bezirk B (Kocher-Rems-Murr)')
    expect(html).toContain('<table')
  })

  it('returns original HTML if no blockquote', () => {
    const html = parseHtmlBody('<div>No forwarding here</div>')
    expect(html).toBe('<div>No forwarding here</div>')
  })
})

describe('textToMarkdown', () => {
  it('converts >> link lines to markdown links', () => {
    const input = '>> Informationen zur Sonderregelung<https://www.wtb-tennis.de/page.html>'
    expect(textToMarkdown(input)).toBe('[Informationen zur Sonderregelung](https://www.wtb-tennis.de/page.html)')
  })

  it('converts inline label<url> to markdown links', () => {
    const input = 'Startseite<https://www.wtb-tennis.de/>  |  Impressum<https://www.wtb-tennis.de/impressum.html>'
    const result = textToMarkdown(input)
    expect(result).toBe('[Startseite](https://www.wtb-tennis.de/)  |  [Impressum](https://www.wtb-tennis.de/impressum.html)')
  })

  it('strips redundant mailto duplicates', () => {
    const input = 'info@wtb-tennis.de<mailto:info@wtb-tennis.de>'
    expect(textToMarkdown(input)).toBe('info@wtb-tennis.de')
  })

  it('normalizes numbered list indentation', () => {
    const input = '  1.  Reiter "Meldung"\n  2.  Meisterschaft "Sommer 2026"'
    expect(textToMarkdown(input)).toBe('1. Reiter "Meldung"\n2. Meisterschaft "Sommer 2026"')
  })

  it('leaves plain text unchanged', () => {
    const input = 'Just a regular paragraph.'
    expect(textToMarkdown(input)).toBe('Just a regular paragraph.')
  })
})

describe('parseInboundEmail', () => {
  it('returns full parsed envelope', () => {
    const result = parseInboundEmail(payload)

    expect(result.forwardedBy.email).toBe('thomas.siebers@tc-waiblingen.de')
    expect(result.forwardedBy.name).toBe('Thomas Siebers')
    expect(result.postmarkMessageId).toBe('d804112a-a87e-4414-a1cf-3e56481837ea')
    expect(result.original.from.email).toBe('no-reply@liga.nu')
    expect(result.original.subject).toContain('Sonderregelung')
    expect(result.body.text).toMatch(/^\[WTB Newsletter\]/)
    expect(result.body.markdown).toContain('[Startseite](https://www.wtb-tennis.de/)')
    expect(result.body.markdown).not.toContain('<mailto:')
    expect(result.body.html).toContain('<table')
  })
})
