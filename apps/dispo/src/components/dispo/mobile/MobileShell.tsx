'use client'

import type { DispoState } from '../useDispoState'

interface MobileShellProps {
  state: DispoState
}

export function MobileShell({ state }: MobileShellProps) {
  return (
    <div className="dispo-mobile-shell">
      <div className="p-4 text-sm text-muted">
        Mobile Shell — {state.matches.length} Heimspiele, {state.assignments.length} Zuordnungen.
      </div>
    </div>
  )
}
