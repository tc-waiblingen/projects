'use client'

import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'

interface MobileShellProps {
  state: DispoState
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  return (
    <div className="mobile-shell">
      <MobileTopBar
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
