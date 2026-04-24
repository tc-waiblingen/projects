'use client'

import clsx from 'clsx'

interface LegendProps {
  compact?: boolean
}

export function Legend({ compact }: LegendProps) {
  return (
    <div className={clsx('legend', compact && 'is-compact')}>
      <div className="legend-item">
        <span className="sw" style={{ background: 'oklch(95% 0.016 86)', border: '1px solid color-mix(in oklch, black 20%, transparent)' }} />
        Frei
      </div>
      <div className="legend-item">
        <span className="sw" style={{ background: 'oklch(58.41% 0.194 30.14)' }} />
        Punktspiel
      </div>
      <div className="legend-item">
        <span className="sw sw-indoor" />
        Hallenplätze
      </div>
    </div>
  )
}
