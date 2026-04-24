'use client'

import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'

interface MobileShellProps {
  state: DispoState
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, date, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  return (
    <div className="mobile-shell">
      <MobileTopBar
        date={date}
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        issues={state.issues}
        onIssueSelect={state.selectMatch}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <div className="mobile-scroll">
        <p className="empty-hint">Tabs und Liste folgen in Task 6.</p>
      </div>
    </div>
  )
}
