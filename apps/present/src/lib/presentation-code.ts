import type Database from 'better-sqlite3'

const DEFAULT_PREFIX = 'WAI'
const CODE_PATTERN = /^[A-Z0-9]{3,8}-[A-Z0-9]{4,8}$/

export function normalizePresentationCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s_]+/g, '-')
}

export function isValidPresentationCode(raw: string): boolean {
  return CODE_PATTERN.test(normalizePresentationCode(raw))
}

export function assertValidPresentationCode(raw: string): string {
  const code = normalizePresentationCode(raw)
  if (!CODE_PATTERN.test(code)) {
    throw new Error('Presentation code must look like WAI-0426')
  }
  return code
}

export function generatePresentationCode(now: Date = new Date(), prefix = DEFAULT_PREFIX): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  return `${normalizePresentationCode(prefix)}-${month}${year}`
}

export function reservePresentationCode(d: Database.Database, preferred: string): string {
  const base = assertValidPresentationCode(preferred)
  if (!codeExists(d, base)) return base

  const [prefix, body] = base.split('-')
  if (!prefix || !body) throw new Error('Invalid presentation code')

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = assertValidPresentationCode(`${prefix}-${body}${suffix}`)
    if (!codeExists(d, candidate)) return candidate
  }

  throw new Error('Unable to reserve a unique presentation code')
}

function codeExists(d: Database.Database, code: string): boolean {
  const row = d.prepare('SELECT 1 FROM presentations WHERE code = ?').get(code)
  return row !== undefined
}
