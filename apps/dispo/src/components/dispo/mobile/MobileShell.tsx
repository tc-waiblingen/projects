'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DayStatus } from '@/components/DayNavigator'
import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'
import { MobileTabs, type MobileTab } from './MobileTabs'
import { MobileMatchList } from './MobileMatchList'
import { MobileEditorSheet } from './MobileEditorSheet'
import { MobilePlanView } from './MobilePlanView'

interface MobileShellProps {
  state: DispoState
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
  statusByKey: Record<string, DayStatus>
}

function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    const update = () => setIsNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isNarrow
}

export function MobileShell({ state, date, prevDateKey, nextDateKey, formattedDate, statusByKey }: MobileShellProps) {
  const [tab, setTab] = useState<MobileTab>('spiele')
  const isNarrow = useIsNarrowViewport()
  const selectedMatch = useMemo(
    () => (state.selectedId ? state.matches.find((m) => m.id === state.selectedId) ?? null : null),
    [state.selectedId, state.matches],
  )
  const selectedAssignment = useMemo(
    () => (state.selectedId ? state.assignments.find((a) => a.matchId === state.selectedId) ?? null : null),
    [state.selectedId, state.assignments],
  )

  return (
    <div className="mobile-shell">
      <MobileTopBar
        dateKey={date}
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        statusByKey={statusByKey}
        issues={state.issues}
        onIssueSelect={(id) => {
          setTab('spiele')
          state.selectMatch(id)
        }}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
        hasPendingRemote={state.pendingRemoteSnapshot !== null}
        onApplyPendingRemote={state.applyRemoteSnapshot}
      />
      <MobileTabs value={tab} onChange={setTab} />
      <div className="mobile-scroll">
        {tab === 'spiele' && (
          <MobileMatchList
            matches={state.matches}
            assignments={state.assignments}
            courts={state.courts}
            selectedId={state.selectedId}
            recentChangeIds={state.recentChangeIds}
            onSelectMatch={state.selectMatch}
            onResetAssignments={state.resetAssignments}
          />
        )}
        {tab === 'plan' && <MobilePlanView state={state} />}
      </div>
      {isNarrow && selectedMatch && (
        <MobileEditorSheet
          match={selectedMatch}
          assignment={selectedAssignment}
          courts={state.courts}
          issues={state.issues}
          onClose={state.clearSelection}
          onToggleCourt={state.toggleCourt}
          onUpdateAssignment={state.updateAssignment}
          onRemoveCourt={state.removeCourtFromAssignment}
        />
      )}
    </div>
  )
}
