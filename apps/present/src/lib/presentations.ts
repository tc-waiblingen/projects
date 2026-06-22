import type Database from 'better-sqlite3'
import { getDb } from './db'
import { assertValidPresentationCode, generatePresentationCode, reservePresentationCode } from './presentation-code'
import { hashViewerPassword } from './viewer-password'

export type PresentationStatus = 'draft' | 'ready' | 'live' | 'ended'
export type PresentationEventType =
  | 'created'
  | 'updated'
  | 'went_live'
  | 'ended'
  | 'screen_started'
  | 'screen_changed'
  | 'viewer_joined'

export interface Presentation {
  id: number
  code: string
  title: string
  slug: string
  moderatorSub: string
  moderatorName: string | null
  viewerPasswordHash: string
  status: PresentationStatus
  livekitRoomName: string
  startsAt: string | null
  endedAt: number | null
  createdAt: number
  updatedAt: number
}

interface PresentationRow {
  id: number
  code: string
  title: string
  slug: string
  moderator_sub: string
  moderator_name: string | null
  viewer_password_hash: string
  status: PresentationStatus
  livekit_room_name: string
  starts_at: string | null
  ended_at: number | null
  created_at: number
  updated_at: number
}

export interface ModeratorIdentity {
  sub: string
  name?: string
}

export interface CreatePresentationInput {
  code?: string
  title: string
  startsAt?: string | null
  viewerPassword: string
  moderator: ModeratorIdentity
}

export interface UpdatePresentationInput {
  title: string
  startsAt?: string | null
  viewerPassword?: string
  status?: PresentationStatus
}

export async function createPresentation(input: CreatePresentationInput, d: Database.Database = getDb()): Promise<Presentation> {
  const now = Date.now()
  const title = normalizeTitle(input.title)
  const preferredCode = input.code ? assertValidPresentationCode(input.code) : generatePresentationCode(new Date(now))
  const code = reservePresentationCode(d, preferredCode)
  const slug = slugify(title)
  const roomName = roomNameForCode(code)
  const passwordHash = await hashViewerPassword(input.viewerPassword)

  const result = d
    .prepare(
      `INSERT INTO presentations (
        code, title, slug, moderator_sub, moderator_name, viewer_password_hash,
        status, livekit_room_name, starts_at, ended_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, NULL, ?, ?)`,
    )
    .run(code, title, slug, input.moderator.sub, input.moderator.name ?? null, passwordHash, roomName, input.startsAt || null, now, now)

  const presentation = getPresentationById(Number(result.lastInsertRowid), d)
  if (!presentation) throw new Error('Created presentation could not be loaded')
  logPresentationEvent(presentation.id, 'created', { code }, d)
  return presentation
}

export async function updatePresentation(
  code: string,
  input: UpdatePresentationInput,
  d: Database.Database = getDb(),
): Promise<Presentation | null> {
  const existing = getPresentationByCode(code, d)
  if (!existing || existing.status === 'ended') return existing

  const now = Date.now()
  const title = normalizeTitle(input.title)
  const slug = slugify(title)
  const status = input.status ?? existing.status

  if (input.viewerPassword?.trim()) {
    const passwordHash = await hashViewerPassword(input.viewerPassword)
    d.prepare(
      `UPDATE presentations
       SET title = ?, slug = ?, starts_at = ?, viewer_password_hash = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(title, slug, input.startsAt || null, passwordHash, status, now, existing.id)
  } else {
    d.prepare(
      `UPDATE presentations
       SET title = ?, slug = ?, starts_at = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(title, slug, input.startsAt || null, status, now, existing.id)
  }

  logPresentationEvent(existing.id, 'updated', { status }, d)
  return getPresentationById(existing.id, d)
}

export function listPresentationsForModerator(
  moderatorSub: string,
  role: 'admin' | 'moderator',
  d: Database.Database = getDb(),
): Presentation[] {
  const rows =
    role === 'admin'
      ? (d.prepare('SELECT * FROM presentations ORDER BY updated_at DESC').all() as PresentationRow[])
      : (d.prepare('SELECT * FROM presentations WHERE moderator_sub = ? ORDER BY updated_at DESC').all(moderatorSub) as PresentationRow[])
  return rows.map(rowToPresentation)
}

export function getPresentationByCode(code: string, d: Database.Database = getDb()): Presentation | null {
  let normalized: string
  try {
    normalized = assertValidPresentationCode(code)
  } catch {
    return null
  }
  const row = d.prepare('SELECT * FROM presentations WHERE code = ?').get(normalized) as PresentationRow | undefined
  return row ? rowToPresentation(row) : null
}

export function getPresentationById(id: number, d: Database.Database = getDb()): Presentation | null {
  const row = d.prepare('SELECT * FROM presentations WHERE id = ?').get(id) as PresentationRow | undefined
  return row ? rowToPresentation(row) : null
}

export function canManagePresentation(presentation: Presentation, session: { sub: string; role: 'admin' | 'moderator' }): boolean {
  return session.role === 'admin' || presentation.moderatorSub === session.sub
}

export function markPresentationLive(code: string, d: Database.Database = getDb()): Presentation | null {
  const presentation = getPresentationByCode(code, d)
  if (!presentation || presentation.status === 'ended') return presentation
  const now = Date.now()
  d.prepare("UPDATE presentations SET status = 'live', updated_at = ? WHERE id = ?").run(now, presentation.id)
  logPresentationEvent(presentation.id, 'went_live', null, d)
  return getPresentationById(presentation.id, d)
}

export function endPresentation(code: string, d: Database.Database = getDb()): Presentation | null {
  const presentation = getPresentationByCode(code, d)
  if (!presentation) return null
  const now = Date.now()
  d.prepare("UPDATE presentations SET status = 'ended', ended_at = ?, updated_at = ? WHERE id = ?").run(now, now, presentation.id)
  logPresentationEvent(presentation.id, 'ended', null, d)
  return getPresentationById(presentation.id, d)
}

export function logPresentationEvent(
  presentationId: number,
  type: PresentationEventType,
  payload: Record<string, unknown> | null,
  d: Database.Database = getDb(),
): void {
  d.prepare('INSERT INTO presentation_events (presentation_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)').run(
    presentationId,
    type,
    payload ? JSON.stringify(payload) : null,
    Date.now(),
  )
}

function rowToPresentation(row: PresentationRow): Presentation {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    slug: row.slug,
    moderatorSub: row.moderator_sub,
    moderatorName: row.moderator_name,
    viewerPasswordHash: row.viewer_password_hash,
    status: row.status,
    livekitRoomName: row.livekit_room_name,
    startsAt: row.starts_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeTitle(raw: string): string {
  const title = raw.trim()
  if (title.length < 3) throw new Error('Title must be at least 3 characters')
  return title
}

function slugify(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'presentation'
}

function roomNameForCode(code: string): string {
  const prefix = process.env.LIVEKIT_ROOM_PREFIX || 'tcw-present'
  return `${prefix}-${code.toLowerCase()}`
}
