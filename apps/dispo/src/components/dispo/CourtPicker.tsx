'use client'

import clsx from 'clsx'
import type { DispoCourt } from '@/lib/directus/courts'

interface CourtPickerProps {
  courts: DispoCourt[]
  value: number[]
  onChange: (next: number[]) => void
}

export function CourtPicker({ courts, value, onChange }: CourtPickerProps) {
  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else onChange([...value, id])
  }
  const indoor = courts.filter((c) => c.type === 'tennis_indoor')
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor')
  return (
    <div className="court-picker">
      {indoor.length > 0 && (
        <div>
          <div className="cp-group-label">Hallenplätze</div>
          <div className="cp-chips">
            {indoor.map((c) => (
              <button
                key={c.id}
                className={clsx('cp-chip', value.includes(c.id) && 'is-on')}
                onClick={() => toggle(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {outdoor.length > 0 && (
        <div>
          <div className="cp-group-label">Freiplätze</div>
          <div className="cp-chips">
            {outdoor.map((c) => (
              <button
                key={c.id}
                className={clsx('cp-chip', value.includes(c.id) && 'is-on')}
                onClick={() => toggle(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
