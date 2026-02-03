'use client'

import { clsx } from 'clsx/lite'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}

export function Toggle({ label, checked, onChange, id }: ToggleProps) {
  const toggleId = id ?? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-taupe-200 py-1 pl-2.5 pr-1 dark:bg-taupe-700">
      <label
        htmlFor={toggleId}
        className="cursor-pointer text-xs font-medium text-taupe-700 dark:text-taupe-200"
      >
        {label}
      </label>
      <button
        id={toggleId}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200',
          checked
            ? 'bg-tcw-red-500 dark:bg-tcw-red-400'
            : 'bg-taupe-400 dark:bg-taupe-500',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}
