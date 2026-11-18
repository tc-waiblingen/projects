import { describe, it, expect } from 'vitest'
import { formatLocationName } from '../format-location'

describe('formatLocationName', () => {
  it.each([
    ['Tennis-Club Waiblingen e.V.', 'Waiblingen'],
    ['TC Waiblingen 1926 e.V.', 'Waiblingen'],
    ['TSV Korb 1897 e.V.', 'Korb'],
    ['Tennisclub Schorndorf', 'Schorndorf'],
    ['SV Fellbach e. V.', 'Fellbach'],
    ['TC Blau-Weiß Stuttgart', 'Blau-Weiß Stuttgart'],
  ])('shortens %s to %s', (input, expected) => {
    expect(formatLocationName(input)).toBe(expected)
  })

  it.each(['TCW Halle', 'Clubhaus', 'Auswärts', 'Heim'])('leaves %s unchanged', (input) => {
    expect(formatLocationName(input)).toBe(input)
  })
})
