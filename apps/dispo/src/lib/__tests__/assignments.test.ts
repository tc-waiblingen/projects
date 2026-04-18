import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  findConflicts,
  getAssignmentCountsByMatchForYear,
  getAssignmentsForDate,
  replaceAssignmentsForDate,
  type AssignmentRow,
} from '../assignments'
import { openDb } from '../db'

describe('assignments', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openDb(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('getAssignmentsForDate', () => {
    it('returns [] when nothing is stored', () => {
      expect(getAssignmentsForDate(db, '2026-04-18')).toEqual([])
    })

    it('returns only the requested date', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1, 2] },
      ])
      replaceAssignmentsForDate(db, '2026-04-19', [
        { matchId: 'm2', matchTime: '14:00', courtIds: [3] },
      ])

      const rows = getAssignmentsForDate(db, '2026-04-18')
      expect(rows.map((r) => r.matchId)).toEqual(['m1', 'm1'])
      expect(rows.map((r) => r.courtId).sort()).toEqual([1, 2])
    })
  })

  describe('replaceAssignmentsForDate', () => {
    it('writes rows', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1, 2, 3] },
      ])
      const rows = getAssignmentsForDate(db, '2026-04-18')
      expect(rows).toHaveLength(3)
      expect(rows[0]?.matchTime).toBe('10:00')
    })

    it('replaces existing rows for the date', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1, 2, 3] },
      ])
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [4, 5] },
      ])
      const rows = getAssignmentsForDate(db, '2026-04-18')
      expect(rows.map((r) => r.courtId).sort()).toEqual([4, 5])
    })

    it('does not touch other dates', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1] },
      ])
      replaceAssignmentsForDate(db, '2026-04-19', [
        { matchId: 'm2', matchTime: '14:00', courtIds: [2] },
      ])
      replaceAssignmentsForDate(db, '2026-04-18', [])
      expect(getAssignmentsForDate(db, '2026-04-18')).toEqual([])
      expect(getAssignmentsForDate(db, '2026-04-19')).toHaveLength(1)
    })

    it('runs as one transaction (all-or-nothing)', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1] },
      ])
      // duplicate primary key (m1,1) on the second row inside the same call
      // — should throw and not have inserted anything new for that date
      expect(() =>
        replaceAssignmentsForDate(db, '2026-04-18', [
          { matchId: 'm1', matchTime: '10:00', courtIds: [1, 1] },
        ]),
      ).toThrow()
      // The DELETE was rolled back, so the original row survives
      expect(getAssignmentsForDate(db, '2026-04-18')).toHaveLength(1)
    })

    it('stores the provided updated_at', () => {
      replaceAssignmentsForDate(
        db,
        '2026-04-18',
        [{ matchId: 'm1', matchTime: '10:00', courtIds: [1] }],
        1700000000,
      )
      expect(getAssignmentsForDate(db, '2026-04-18')[0]?.updatedAt).toBe(1700000000)
    })
  })

  describe('findConflicts', () => {
    const make = (matchId: string, courtId: number, matchTime: string): AssignmentRow => ({
      matchId,
      courtId,
      matchDate: '2026-04-18',
      matchTime,
      updatedAt: 0,
    })

    it('returns [] when no overlaps', () => {
      expect(
        findConflicts([make('m1', 1, '10:00'), make('m1', 2, '10:00'), make('m2', 3, '10:00')]),
      ).toEqual([])
    })

    it('detects two matches on the same court at the same time', () => {
      const conflicts = findConflicts([make('m1', 1, '10:00'), make('m2', 1, '10:00')])
      expect(conflicts).toEqual([
        { courtId: 1, matchTime: '10:00', matchIds: ['m1', 'm2'] },
      ])
    })

    it('does not flag the same court at different times', () => {
      expect(
        findConflicts([make('m1', 1, '10:00'), make('m2', 1, '14:00')]),
      ).toEqual([])
    })
  })

  describe('getAssignmentCountsByMatchForYear', () => {
    it('returns empty map when nothing stored', () => {
      expect(getAssignmentCountsByMatchForYear(db, 2026).size).toBe(0)
    })

    it('counts rows per match within the requested year only', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1, 2] },
        { matchId: 'm2', matchTime: '14:00', courtIds: [3] },
      ])
      replaceAssignmentsForDate(db, '2026-12-31', [
        { matchId: 'm3', matchTime: '10:00', courtIds: [1, 2, 3] },
      ])
      replaceAssignmentsForDate(db, '2025-12-31', [
        { matchId: 'm4', matchTime: '10:00', courtIds: [1] },
      ])
      replaceAssignmentsForDate(db, '2027-01-01', [
        { matchId: 'm5', matchTime: '10:00', courtIds: [1] },
      ])

      const map = getAssignmentCountsByMatchForYear(db, 2026)
      expect(map.get('m1')).toBe(2)
      expect(map.get('m2')).toBe(1)
      expect(map.get('m3')).toBe(3)
      expect(map.has('m4')).toBe(false)
      expect(map.has('m5')).toBe(false)
    })
  })
})
