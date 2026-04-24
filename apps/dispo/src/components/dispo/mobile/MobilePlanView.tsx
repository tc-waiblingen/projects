'use client'

import clsx from 'clsx'
import { useState } from 'react'
import type { DispoState } from '../useDispoState'
import { MobilePlanColumns } from './MobilePlanColumns'
import { MobilePlanStrips } from './MobilePlanStrips'

type SubView = 'columns' | 'strips'

interface MobilePlanViewProps {
  state: DispoState
}

export function MobilePlanView({ state }: MobilePlanViewProps) {
  const [sub, setSub] = useState<SubView>('columns')

  return (
    <div className="mobile-plan-view">
      <div className="mobile-subtoggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sub === 'columns'}
          className={clsx('mobile-subtoggle-btn', sub === 'columns' && 'is-active')}
          onClick={() => setSub('columns')}
        >
          Spalten
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sub === 'strips'}
          className={clsx('mobile-subtoggle-btn', sub === 'strips' && 'is-active')}
          onClick={() => setSub('strips')}
        >
          Streifen
        </button>
      </div>
      {sub === 'columns' && (
        <MobilePlanColumns
          courts={state.courts}
          matches={state.matches}
          assignments={state.assignments}
          selectedId={state.selectedId}
          nowMinutes={state.nowMinutes}
          bookings={state.bookings}
          recentlyChangedCells={state.recentlyChangedCells}
          onSelectMatch={state.selectMatch}
        />
      )}
      {sub === 'strips' && (
        <MobilePlanStrips
          courts={state.courts}
          matches={state.matches}
          assignments={state.assignments}
          conflicts={state.conflicts}
          bookings={state.bookings}
          recentlyChangedCells={state.recentlyChangedCells}
          onSelectMatch={state.selectMatch}
        />
      )}
    </div>
  )
}
