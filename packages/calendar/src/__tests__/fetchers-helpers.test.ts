import { describe, expect, it } from 'vitest'
import { _testHelpers } from '../fetchers'

const { formatTime, decodeHtmlText, parseDirectusDateTime, parseIcalAttachments } = _testHelpers

describe('formatTime', () => {
  it('formats time as HH:MM', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45)
    expect(formatTime(date)).toBe('14:30')
  })

  it('pads single-digit hours', () => {
    const date = new Date(2024, 5, 15, 9, 5, 0)
    expect(formatTime(date)).toBe('09:05')
  })

  it('handles midnight', () => {
    const date = new Date(2024, 5, 15, 0, 0, 0)
    expect(formatTime(date)).toBe('00:00')
  })

  it('handles noon', () => {
    const date = new Date(2024, 5, 15, 12, 0, 0)
    expect(formatTime(date)).toBe('12:00')
  })

  it('handles end of day', () => {
    const date = new Date(2024, 5, 15, 23, 59, 59)
    expect(formatTime(date)).toBe('23:59')
  })
})

describe('decodeHtmlText', () => {
  it('decodes &amp;', () => {
    expect(decodeHtmlText('Tom &amp; Jerry')).toBe('Tom & Jerry')
  })

  it('decodes &lt; and &gt; (then strips if forms valid tag)', () => {
    expect(decodeHtmlText('a &lt; b &gt; c')).toBe('a c')
    expect(decodeHtmlText('5 is &gt; 3')).toBe('5 is > 3')
    expect(decodeHtmlText('use &lt;br&gt; for breaks')).toBe('use \n for breaks')
  })

  it('decodes &quot;', () => {
    expect(decodeHtmlText('&quot;Hello&quot;')).toBe('"Hello"')
  })

  it('decodes &#39; and &apos;', () => {
    expect(decodeHtmlText("It&#39;s &apos;fine&apos;")).toBe("It's 'fine'")
  })

  it('decodes &nbsp;', () => {
    expect(decodeHtmlText('Hello&nbsp;World')).toBe('Hello World')
  })

  it('decodes &ndash; and &mdash;', () => {
    expect(decodeHtmlText('a &ndash; b &mdash; c')).toBe('a – b — c')
  })

  it('decodes &euro;', () => {
    expect(decodeHtmlText('Price: 50&euro;')).toBe('Price: 50€')
  })

  it('decodes numeric entities', () => {
    expect(decodeHtmlText('&#65;&#66;&#67;')).toBe('ABC')
  })

  it('decodes hex entities', () => {
    expect(decodeHtmlText('&#x41;&#x42;&#x43;')).toBe('ABC')
  })

  it('converts <br> to newline', () => {
    expect(decodeHtmlText('Line1<br>Line2')).toBe('Line1\nLine2')
  })

  it('converts <br/> to newline', () => {
    expect(decodeHtmlText('Line1<br/>Line2')).toBe('Line1\nLine2')
  })

  it('converts </p> to newline', () => {
    expect(decodeHtmlText('<p>Para1</p><p>Para2</p>')).toBe('Para1\nPara2')
  })

  it('strips remaining HTML tags', () => {
    expect(decodeHtmlText('<strong>Bold</strong> text')).toBe('Bold text')
  })

  it('normalizes multiple spaces', () => {
    expect(decodeHtmlText('Too   many    spaces')).toBe('Too many spaces')
  })

  it('normalizes multiple newlines', () => {
    expect(decodeHtmlText('Line1\n\n\nLine2')).toBe('Line1\nLine2')
  })

  it('trims whitespace', () => {
    expect(decodeHtmlText('  Hello World  ')).toBe('Hello World')
  })

  it('handles complex HTML', () => {
    const html = '<div><p>Hello &amp; <strong>World</strong></p><br/><p>Goodbye</p></div>'
    const result = decodeHtmlText(html)
    expect(result).toContain('Hello & World')
    expect(result).toContain('Goodbye')
  })
})

describe('parseDirectusDateTime', () => {
  it('parses date-only string', () => {
    const result = parseDirectusDateTime('2024-06-15')
    expect(result.date.getFullYear()).toBe(2024)
    expect(result.date.getMonth()).toBe(5)
    expect(result.date.getDate()).toBe(15)
    expect(result.time).toBeNull()
  })

  it('parses datetime string', () => {
    const result = parseDirectusDateTime('2024-06-15T14:30:00')
    expect(result.date.getFullYear()).toBe(2024)
    expect(result.date.getMonth()).toBe(5)
    expect(result.date.getDate()).toBe(15)
    expect(result.time).toBe('14:30')
  })

  it('parses datetime with seconds', () => {
    const result = parseDirectusDateTime('2024-06-15T09:05:30')
    expect(result.time).toBe('09:05')
  })

  it('handles empty date part', () => {
    const result = parseDirectusDateTime('')
    expect(result.time).toBeNull()
  })

  it('handles T without time', () => {
    const result = parseDirectusDateTime('2024-06-15T')
    expect(result.date.getFullYear()).toBe(2024)
    expect(result.time).toBeNull()
  })
})

describe('parseIcalAttachments', () => {
  it('extracts ATTACH URL from event', () => {
    const ics = `BEGIN:VEVENT
UID:event-123
ATTACH:https://example.com/image.jpg
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.get('event-123')).toBe('https://example.com/image.jpg')
  })

  it('extracts IMAGE URL from event', () => {
    const ics = `BEGIN:VEVENT
UID:event-456
IMAGE:https://example.com/photo.png
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.get('event-456')).toBe('https://example.com/photo.png')
  })

  it('handles multiple events', () => {
    const ics = `BEGIN:VEVENT
UID:event-1
ATTACH:https://example.com/img1.jpg
END:VEVENT
BEGIN:VEVENT
UID:event-2
ATTACH:https://example.com/img2.jpg
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.get('event-1')).toBe('https://example.com/img1.jpg')
    expect(result.get('event-2')).toBe('https://example.com/img2.jpg')
  })

  it('handles line folding', () => {
    const ics = `BEGIN:VEVENT
UID:event-789
ATTACH:https://example.com/very-long-
 url-that-continues.jpg
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.get('event-789')).toBe('https://example.com/very-long-url-that-continues.jpg')
  })

  it('ignores non-http attachments', () => {
    const ics = `BEGIN:VEVENT
UID:event-abc
ATTACH:data:image/png;base64,abc123
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.has('event-abc')).toBe(false)
  })

  it('ignores events without UID', () => {
    const ics = `BEGIN:VEVENT
ATTACH:https://example.com/img.jpg
END:VEVENT`
    const result = parseIcalAttachments(ics)
    expect(result.size).toBe(0)
  })

  it('returns empty map for empty input', () => {
    const result = parseIcalAttachments('')
    expect(result.size).toBe(0)
  })
})
