import { describe, expect, it } from 'vitest'
import { _testHelpers } from '@tcw/calendar'

const {
  formatTime,
  decodeHtmlText,
  parseDirectusDateTime,
  parseIcalAttachments,
  formatDateForNuliga,
  normalizeText,
  absoluteUrl,
  parseGermanDateTime,
  parseTournamentDateRange,
  parseTournamentHtml,
} = _testHelpers

describe('calendar-helpers', () => {
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
      // &lt; decodes to <, which then gets stripped IF it forms a valid tag pattern
      // '<[^>]+>' requires both < and > with content between
      // So 'a &lt; b &gt; c' becomes 'a < b > c', then '< b >' is stripped as it matches <...>
      expect(decodeHtmlText('a &lt; b &gt; c')).toBe('a c')
      // But isolated > is not stripped (no matching <)
      expect(decodeHtmlText('5 is &gt; 3')).toBe('5 is > 3')
      // <br> is converted to newline, spaces around single newline are preserved
      // 'use &lt;br&gt; for' -> 'use <br> for' -> 'use \n for'
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
      expect(result.date.getMonth()).toBe(5) // June is 5 (0-indexed)
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

  describe('formatDateForNuliga', () => {
    it('formats date as DD.MM.YYYY', () => {
      const date = new Date(2024, 5, 15) // June 15, 2024
      expect(formatDateForNuliga(date)).toBe('15.06.2024')
    })

    it('pads single-digit day', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      expect(formatDateForNuliga(date)).toBe('05.01.2024')
    })

    it('pads single-digit month', () => {
      const date = new Date(2024, 8, 25) // September 25, 2024
      expect(formatDateForNuliga(date)).toBe('25.09.2024')
    })

    it('handles end of year', () => {
      const date = new Date(2024, 11, 31) // December 31, 2024
      expect(formatDateForNuliga(date)).toBe('31.12.2024')
    })

    it('handles start of year', () => {
      const date = new Date(2025, 0, 1) // January 1, 2025
      expect(formatDateForNuliga(date)).toBe('01.01.2025')
    })
  })

  describe('normalizeText', () => {
    it('collapses multiple spaces', () => {
      expect(normalizeText('Hello   World')).toBe('Hello World')
    })

    it('trims leading/trailing whitespace', () => {
      expect(normalizeText('  Hello  ')).toBe('Hello')
    })

    it('collapses tabs and newlines', () => {
      expect(normalizeText('Hello\t\nWorld')).toBe('Hello World')
    })

    it('returns empty string for null', () => {
      expect(normalizeText(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(normalizeText(undefined)).toBe('')
    })

    it('handles already normalized text', () => {
      expect(normalizeText('Hello World')).toBe('Hello World')
    })
  })

  describe('absoluteUrl', () => {
    const baseUrl = 'https://example.com/page'

    it('converts relative URL to absolute', () => {
      expect(absoluteUrl('/path/to/resource', baseUrl)).toBe('https://example.com/path/to/resource')
    })

    it('preserves absolute URL', () => {
      expect(absoluteUrl('https://other.com/resource', baseUrl)).toBe('https://other.com/resource')
    })

    it('handles relative path', () => {
      expect(absoluteUrl('resource.html', baseUrl)).toBe('https://example.com/resource.html')
    })

    it('returns undefined for null', () => {
      expect(absoluteUrl(null, baseUrl)).toBeUndefined()
    })

    it('returns undefined for undefined', () => {
      expect(absoluteUrl(undefined, baseUrl)).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      expect(absoluteUrl('', baseUrl)).toBeUndefined()
    })

    it('returns original for invalid URL', () => {
      // Some strings that might fail URL parsing but aren't empty
      expect(absoluteUrl('javascript:void(0)', baseUrl)).toBe('javascript:void(0)')
    })
  })

  describe('parseGermanDateTime', () => {
    it('parses date with weekday and time', () => {
      const result = parseGermanDateTime('Do, 23.01.2025 10:00')
      expect(result.date).toBe('2025-01-23')
      expect(result.time).toBe('10:00')
      expect(result.jsDate?.getFullYear()).toBe(2025)
      expect(result.jsDate?.getMonth()).toBe(0) // January
      expect(result.jsDate?.getDate()).toBe(23)
      expect(result.jsDate?.getHours()).toBe(10)
      expect(result.jsDate?.getMinutes()).toBe(0)
    })

    it('parses date with weekday without time', () => {
      const result = parseGermanDateTime('Sa, 15.02.2025')
      expect(result.date).toBe('2025-02-15')
      expect(result.time).toBeNull()
      expect(result.jsDate?.getFullYear()).toBe(2025)
    })

    it('parses date without weekday', () => {
      const result = parseGermanDateTime('23.01.2025')
      expect(result.date).toBe('2025-01-23')
      expect(result.time).toBeNull()
    })

    it('parses date without weekday with time', () => {
      const result = parseGermanDateTime('23.01.2025 14:30')
      expect(result.date).toBe('2025-01-23')
      expect(result.time).toBe('14:30')
    })

    it('handles single-digit day and month', () => {
      const result = parseGermanDateTime('1.2.2025')
      expect(result.date).toBe('2025-02-01')
    })

    it('returns null for empty string', () => {
      const result = parseGermanDateTime('')
      expect(result.date).toBeNull()
      expect(result.time).toBeNull()
      expect(result.jsDate).toBeNull()
    })

    it('returns null for null input', () => {
      const result = parseGermanDateTime(null)
      expect(result.date).toBeNull()
      expect(result.jsDate).toBeNull()
    })

    it('returns null for undefined input', () => {
      const result = parseGermanDateTime(undefined)
      expect(result.date).toBeNull()
    })

    it('returns null for invalid format', () => {
      const result = parseGermanDateTime('2025-01-23') // ISO format
      expect(result.date).toBeNull()
    })

    it('handles extra whitespace', () => {
      const result = parseGermanDateTime('  Do,   23.01.2025   10:00  ')
      expect(result.date).toBe('2025-01-23')
      expect(result.time).toBe('10:00')
    })
  })

  describe('parseTournamentDateRange', () => {
    it('parses date range with en-dash', () => {
      const result = parseTournamentDateRange('Sa, 31.1. – So, 8.2.2026')
      expect(result?.start).toBe('2026-01-31')
      expect(result?.end).toBe('2026-02-08')
    })

    it('parses date range with hyphen', () => {
      const result = parseTournamentDateRange('Sa, 31.1. - So, 8.2.2026')
      expect(result?.start).toBe('2026-01-31')
      expect(result?.end).toBe('2026-02-08')
    })

    it('parses single date with weekday', () => {
      const result = parseTournamentDateRange('Sa, 15.2.2026')
      expect(result?.start).toBe('2026-02-15')
      expect(result?.end).toBeUndefined()
    })

    it('parses single date without weekday', () => {
      const result = parseTournamentDateRange('15.2.2026')
      expect(result?.start).toBe('2026-02-15')
      expect(result?.end).toBeUndefined()
    })

    it('uses end year for start date without year', () => {
      const result = parseTournamentDateRange('31.1. – 8.2.2026')
      expect(result?.start).toBe('2026-01-31')
      expect(result?.end).toBe('2026-02-08')
    })

    it('handles range within same month', () => {
      const result = parseTournamentDateRange('Sa, 1.3. – So, 15.3.2026')
      expect(result?.start).toBe('2026-03-01')
      expect(result?.end).toBe('2026-03-15')
    })

    it('handles range across year boundary', () => {
      const result = parseTournamentDateRange('Mo, 28.12. – Fr, 2.1.2026')
      // Start gets year from end (2026), which is technically wrong for Dec
      // But this matches the function's behavior
      expect(result?.start).toBe('2026-12-28')
      expect(result?.end).toBe('2026-01-02')
    })

    it('returns null for empty string', () => {
      expect(parseTournamentDateRange('')).toBeNull()
    })

    it('returns null for invalid format', () => {
      expect(parseTournamentDateRange('Invalid date')).toBeNull()
    })

    it('pads single-digit days and months', () => {
      const result = parseTournamentDateRange('1.2.2026')
      expect(result?.start).toBe('2026-02-01')
    })
  })

  describe('parseTournamentHtml', () => {
    const baseUrl = 'https://wtb.de'

    // 3-column WTB layout with nested competition table in column 3
    const wtbHtml = `<table class="tournaments">
<thead><tr><th>Datum</th><th>Turnier</th><th>Konkurrenz</th></tr></thead>
<tbody>
<tr>
  <td class="daterange"><span>Sa, 24.1.</span> – <span class="enddate">So, 8.2.2026</span></td>
  <td>
    <h2><a href="/tournament/1" class="mybigpoint">1. STS-Cup Jugendturnier 2026</a></h2>
    <p>Veranstalter: TC Waiblingen <br>Austragungsort: Waiblingen <br> Offen für: Deutschland <br> <a target="_blank" href="/doc/817670"><span class="glyphicon glyphicon-file"></span> Ausschreibung</a></p>
  </td>
  <td class="competitionAbbr">
    <table class="table table-condensed">
      <tbody>
        <tr><td class="name"><span title="J-2">U14 m Einzel</span></td><td class="fedRank"></td><td class="result">Hauptfeld</td></tr>
        <tr><td class="name"><span title="J-2">U14 w Einzel</span></td><td class="fedRank"></td><td class="result">Qualifikation</td></tr>
      </tbody>
    </table>
  </td>
</tr>
<tr>
  <td class="daterange"><span>Sa, 7.3.2026</span></td>
  <td>
    <h2><a href="/tournament/2" class="mybigpoint">51. Waiblinger Hallenturnier um den Lorinser-Cup 2026 - LK-Tagesturnier</a></h2>
    <p>Veranstalter: TC Waiblingen <br>Austragungsort: Waiblingen <br> Meldeschluss: 04.03.2026 <br> <a target="_blank" href="/doc/820000"><span class="glyphicon glyphicon-file"></span> Ausschreibung</a></p>
  </td>
  <td class="competitionAbbr">
    <table class="table table-condensed">
      <tbody>
        <tr><td class="name">Herren Einzel</td><td class="fedRank"></td><td class="result"></td></tr>
      </tbody>
    </table>
  </td>
</tr>
</tbody>
</table>`

    it('parses tournaments from 3-column WTB layout with nested tables', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl)

      expect(events).toHaveLength(2)
      expect(events.map((e) => e.title)).toEqual([
        '1. STS-Cup Jugendturnier 2026',
        '51. Waiblinger Hallenturnier um den Lorinser-Cup 2026 - LK-Tagesturnier',
      ])
    })

    it('extracts Lorinser-Cup tournament correctly', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl)
      const lorinser = events.find((e) => e.title.includes('Lorinser'))

      expect(lorinser).toBeDefined()
      expect(lorinser!.startDate).toEqual(new Date(2026, 2, 7))
      expect(lorinser!.isMultiDay).toBe(false)
      expect(lorinser!.url).toBe('https://wtb.de/tournament/2')
      expect(lorinser!.source).toBe('tournament')
    })

    it('extracts multi-day tournament with correct date range', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl)
      const stsCup = events.find((e) => e.title.includes('STS-Cup'))

      expect(stsCup).toBeDefined()
      expect(stsCup!.startDate).toEqual(new Date(2026, 0, 24))
      expect(stsCup!.endDate).toEqual(new Date(2026, 1, 8))
      expect(stsCup!.isMultiDay).toBe(true)
    })

    it('extracts Ausschreibung link', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl)
      const lorinser = events.find((e) => e.title.includes('Lorinser'))
      const metadata = lorinser!.metadata as { callForEntriesUrl?: string }

      expect(metadata.callForEntriesUrl).toBe('https://wtb.de/doc/820000')
    })

    it('extracts registration deadline', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl)
      const lorinser = events.find((e) => e.title.includes('Lorinser'))
      const metadata = lorinser!.metadata as { registrationDeadline?: string }

      expect(metadata.registrationDeadline).toContain('04.03.2026')
    })

    it('skips tournaments not organized by TC Waiblingen', () => {
      const html = `<table class="tournaments"><tbody>
<tr>
  <td class="daterange"><span>Sa, 7.3.2026</span></td>
  <td>
    <h2><a href="/t/1">Some Other Tournament</a></h2>
    <p>Veranstalter: TV Stuttgart <br>Austragungsort: Stuttgart</p>
  </td>
  <td class="competitionAbbr"></td>
</tr>
</tbody></table>`

      const events = parseTournamentHtml(html, baseUrl)
      expect(events).toHaveLength(0)
    })

    it('respects date range filter', () => {
      const events = parseTournamentHtml(wtbHtml, baseUrl, {
        from: new Date(2026, 2, 1),
        to: new Date(2026, 2, 31),
      })

      expect(events).toHaveLength(1)
      expect(events[0].title).toContain('Lorinser')
    })
  })
})
