import type { DispoCourt } from '@/lib/directus/courts'
import type { DayMatch } from '@/lib/matches'
import clsx from 'clsx'

interface AssignmentTableProps {
  courts: DispoCourt[]
  matches: DayMatch[]
  selections: Record<string, number[]>
}

export function AssignmentTable({ courts, matches, selections }: AssignmentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-tcw-accent-200 dark:border-tcw-accent-800">
            <th className="px-2 py-2 text-left font-semibold text-body">Gruppe</th>
            <th className="px-2 py-2 text-left font-semibold text-body">Begegnung</th>
            <th className="px-2 py-2 text-left font-semibold text-body">Zeit</th>
            {courts.map((c) => (
              <th key={c.id} className="px-1 py-2 text-center font-semibold text-body">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const assigned = new Set(selections[m.id] ?? [])
            const isUnassigned = assigned.size === 0
            return (
              <tr
                key={m.id}
                className={clsx('border-b border-tcw-accent-100 dark:border-tcw-accent-800/50', isUnassigned && 'opacity-60')}
              >
                <td className="px-2 py-2 align-middle text-muted">{m.group}</td>
                <td className="px-2 py-2 align-middle text-body">
                  {m.homeTeam} <span className="text-muted">vs</span> {m.opponent}
                </td>
                <td className="px-2 py-2 align-middle font-mono tabular-nums text-body">{m.startTime}</td>
                {courts.map((c) => (
                  <td key={c.id} className="px-1 py-2 text-center">
                    {assigned.has(c.id) ? (
                      <span className="inline-block h-3 w-3 rounded-full bg-green-700 dark:bg-green-500" aria-label="zugewiesen" />
                    ) : (
                      <span className="text-tcw-accent-300 dark:text-tcw-accent-700">·</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
