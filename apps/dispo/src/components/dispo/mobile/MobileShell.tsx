'use client'

import { useState } from 'react'
import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'
import { MobileTabs, type MobileTab } from './MobileTabs'
import { MobileMatchList } from './MobileMatchList'

interface MobileShellProps {
  state: DispoState
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  const [tab, setTab] = useState<MobileTab>('spiele')
  return (
    <div className="mobile-shell">
      <MobileTopBar
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        issues={state.issues}
        onIssueSelect={(id) => {
          setTab('spiele')
          state.selectMatch(id)
        }}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <MobileTabs value={tab} onChange={setTab} />
      <div className="mobile-scroll">
        {tab === 'spiele' && (
          <MobileMatchList
            matches={state.matches}
            assignments={state.assignments}
            selectedId={state.selectedId}
            recentChangeIds={state.recentChangeIds}
            onSelectMatch={state.selectMatch}
            onResetAssignments={state.resetAssignments}
          />
        )}
        {tab === 'plan' && <div className="empty-hint">Plan view folgt in Task 8/9.</div>}
      </div>
    </div>
  )
}
