'use client'

import clsx from 'clsx'

export type MobileTab = 'spiele' | 'plan'

interface MobileTabsProps {
  value: MobileTab
  onChange: (t: MobileTab) => void
}

export function MobileTabs({ value, onChange }: MobileTabsProps) {
  return (
    <div className="mobile-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'spiele'}
        className={clsx('mobile-tab', value === 'spiele' && 'is-active')}
        onClick={() => onChange('spiele')}
      >
        Spiele
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'plan'}
        className={clsx('mobile-tab', value === 'plan' && 'is-active')}
        onClick={() => onChange('plan')}
      >
        Plan
      </button>
    </div>
  )
}
