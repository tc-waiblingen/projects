import { describe, expect, it } from 'vitest'
import { openDb } from '../db'
import {
  canManagePresentation,
  createPresentation,
  endPresentation,
  getPresentationByCode,
  listPresentationsForModerator,
  markPresentationLive,
  updatePresentation,
} from '../presentations'
import { verifyViewerPassword } from '../viewer-password'

describe('presentations', () => {
  it('creates and loads a presentation', async () => {
    const d = openDb(':memory:')
    const presentation = await createPresentation(
      {
        code: 'WAI-0626',
        title: 'Jahreshauptversammlung',
        startsAt: '2026-07-17',
        viewerPassword: 'Sommer2026',
        moderator: { sub: 'entra:1', name: 'Tom' },
      },
      d,
    )

    expect(presentation.code).toBe('WAI-0626')
    expect(presentation.livekitRoomName).toBe('tcw-present-wai-0626')
    expect(presentation.status).toBe('draft')
    await expect(verifyViewerPassword(presentation.viewerPasswordHash, 'Sommer2026')).resolves.toBe(true)
    expect(getPresentationByCode('wai_0626', d)?.id).toBe(presentation.id)
    d.close()
  })

  it('creates a presentation with no viewer password', async () => {
    const d = openDb(':memory:')
    const presentation = await createPresentation(
      {
        code: 'WAI-0626',
        title: 'Jahreshauptversammlung',
        viewerPassword: '',
        moderator: { sub: 'entra:1', name: 'Tom' },
      },
      d,
    )

    expect(presentation.viewerPasswordHash).toBe('')
    await expect(verifyViewerPassword(presentation.viewerPasswordHash, '')).resolves.toBe(true)
    await expect(verifyViewerPassword(presentation.viewerPasswordHash, 'Sommer2026')).resolves.toBe(false)
    d.close()
  })

  it('lists by moderator unless the session is admin', async () => {
    const d = openDb(':memory:')
    await createPresentation({ code: 'WAI-0626', title: 'First', viewerPassword: 'pass1', moderator: { sub: 'entra:1' } }, d)
    await createPresentation({ code: 'WAI-0726', title: 'Second', viewerPassword: 'pass2', moderator: { sub: 'entra:2' } }, d)

    expect(listPresentationsForModerator('entra:1', 'moderator', d)).toHaveLength(1)
    expect(listPresentationsForModerator('entra:1', 'admin', d)).toHaveLength(2)
    d.close()
  })

  it('updates and transitions lifecycle state', async () => {
    const d = openDb(':memory:')
    await createPresentation({ code: 'WAI-0626', title: 'First', viewerPassword: 'pass1', moderator: { sub: 'entra:1' } }, d)

    const updated = await updatePresentation('WAI-0626', { title: 'Updated', startsAt: '2026-07-17', status: 'ready' }, d)
    expect(updated?.title).toBe('Updated')
    expect(updated?.status).toBe('ready')
    await expect(verifyViewerPassword(updated?.viewerPasswordHash, 'pass1')).resolves.toBe(true)

    const cleared = await updatePresentation('WAI-0626', { title: 'Updated', viewerPassword: '' }, d)
    expect(cleared?.viewerPasswordHash).toBe('')

    const live = markPresentationLive('WAI-0626', d)
    expect(live?.status).toBe('live')

    const ended = endPresentation('WAI-0626', d)
    expect(ended?.status).toBe('ended')
    expect(ended?.endedAt).toEqual(expect.any(Number))

    const restarted = markPresentationLive('WAI-0626', d)
    expect(restarted?.status).toBe('live')
    expect(restarted?.endedAt).toBeNull()
    d.close()
  })

  it('checks management access', async () => {
    const d = openDb(':memory:')
    const presentation = await createPresentation({ code: 'WAI-0626', title: 'First', viewerPassword: 'pass1', moderator: { sub: 'entra:1' } }, d)
    expect(canManagePresentation(presentation, { sub: 'entra:1', role: 'moderator' })).toBe(true)
    expect(canManagePresentation(presentation, { sub: 'entra:2', role: 'moderator' })).toBe(false)
    expect(canManagePresentation(presentation, { sub: 'entra:2', role: 'admin' })).toBe(true)
    d.close()
  })
})
