'use client'

import type { DispoCourt } from '@/lib/directus/courts'
import type { DayMatch } from '@/lib/matches'
import { getCourtCount } from '@tcw/calendar'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface AssignmentFormProps {
  date: string
  courts: DispoCourt[]
  matches: DayMatch[]
  initialSelections: Record<string, number[]>
}

interface Conflict {
  courtId: number
  matchTime: string
  matchIds: string[]
}

function findConflicts(matches: DayMatch[], selections: Record<string, Set<number>>): Conflict[] {
  const groups = new Map<string, { courtId: number; matchTime: string; matchIds: string[] }>()
  for (const match of matches) {
    const courts = selections[match.id]
    if (!courts) continue
    for (const courtId of courts) {
      const key = `${courtId}__${match.startTime}`
      const existing = groups.get(key)
      if (existing) {
        existing.matchIds.push(match.id)
      } else {
        groups.set(key, { courtId, matchTime: match.startTime, matchIds: [match.id] })
      }
    }
  }
  return Array.from(groups.values()).filter((g) => g.matchIds.length > 1)
}

export function AssignmentForm({ date, courts, matches, initialSelections }: AssignmentFormProps) {
  const router = useRouter()

  const [selections, setSelections] = useState<Record<string, Set<number>>>(() => {
    const map: Record<string, Set<number>> = {}
    for (const match of matches) {
      map[match.id] = new Set(initialSelections[match.id] ?? [])
    }
    return map
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const conflicts = useMemo(() => findConflicts(matches, selections), [matches, selections])
  const conflictCellKey = useMemo(() => {
    const set = new Set<string>()
    for (const c of conflicts) {
      set.add(`${c.courtId}__${c.matchTime}`)
    }
    return set
  }, [conflicts])

  const toggle = (matchId: string, courtId: number) => {
    setSelections((prev) => {
      const next = { ...prev }
      const current = new Set(prev[matchId] ?? [])
      if (current.has(courtId)) current.delete(courtId)
      else current.add(courtId)
      next[matchId] = current
      return next
    })
    setSavedAt(null)
  }

  const onSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const rows = matches.map((m) => ({
        matchId: m.id,
        matchTime: m.startTime,
        courtIds: Array.from(selections[m.id] ?? []).sort((a, b) => a - b),
      }))
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, rows }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(text || `HTTP ${res.status}`)
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {conflicts.length === 0 ? (
        <p className="mb-4 inline-block rounded-md bg-green-900/10 px-3 py-1.5 text-sm text-green-900 dark:bg-green-900/20 dark:text-green-200">
          Konflikte: keine
        </p>
      ) : (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          <strong>Konflikt:</strong> {conflicts.length} {conflicts.length === 1 ? 'Platz/Zeit' : 'Plätze/Zeiten'} doppelt belegt.
          <ul className="mt-1 list-disc pl-5">
            {conflicts.map((c) => {
              const court = courts.find((co) => co.id === c.courtId)
              return (
                <li key={`${c.courtId}-${c.matchTime}`}>
                  {court?.name ?? `Platz #${c.courtId}`} um {c.matchTime} ({c.matchIds.length} Spiele)
                </li>
              )
            })}
          </ul>
          <p className="mt-1 text-xs">Speichern ist trotzdem möglich.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-tcw-accent-200 dark:border-tcw-accent-800">
              <th className="px-2 py-2 text-left font-semibold text-body">Gruppe</th>
              <th className="px-2 py-2 text-left font-semibold text-body">Begegnung</th>
              <th className="px-2 py-2 text-left font-semibold text-body">Zeit</th>
              {courts.map((c) => (
                <th key={c.id} className="px-1 py-2 text-center font-semibold text-body">
                  {c.name}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-body">Plätze</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const selected = selections[m.id] ?? new Set<number>()
              const expected = getCourtCount(m.league)
              const ratioOk = selected.size === expected
              return (
                <tr key={m.id} className={clsx('border-b border-tcw-accent-100 dark:border-tcw-accent-800/50', !ratioOk && 'bg-amber-50/40 dark:bg-amber-900/10')}>
                  <td className="px-2 py-2 align-middle text-muted">{m.leagueShort}</td>
                  <td className="px-2 py-2 align-middle text-body">
                    {m.homeTeam} <span className="text-muted">vs</span> {m.opponent}
                  </td>
                  <td className="px-2 py-2 align-middle font-mono tabular-nums text-body">{m.startTime}</td>
                  {courts.map((c) => {
                    const isSelected = selected.has(c.id)
                    const isConflict = isSelected && conflictCellKey.has(`${c.id}__${m.startTime}`)
                    return (
                      <td
                        key={c.id}
                        className={clsx('px-1 py-1 text-center', isConflict && 'bg-amber-100 dark:bg-amber-900/40')}
                      >
                        <label className="inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 cursor-pointer accent-tcw-red-700"
                            checked={isSelected}
                            onChange={() => toggle(m.id, c.id)}
                          />
                        </label>
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center">
                    <span className={clsx('font-mono tabular-nums', ratioOk ? 'text-muted' : 'font-bold text-amber-700 dark:text-amber-300')}>
                      {selected.size}/{expected}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {saveError && (
          <span className="text-sm text-tcw-red-700 dark:text-tcw-red-300">{saveError}</span>
        )}
        {savedAt && !saveError && (
          <span className="text-sm text-green-700 dark:text-green-300">Gespeichert.</span>
        )}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="cursor-pointer rounded-md border border-tcw-accent-300 px-4 py-2 text-sm text-muted hover:text-body dark:border-tcw-accent-700"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-tcw-red-500 disabled:opacity-60"
        >
          {saving ? 'Speichern …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
