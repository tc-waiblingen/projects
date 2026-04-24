import type { MatchAssignmentInput } from './assignments'
import type { MatchPlanInput } from './match-plans'

export interface AssignmentsUpdate {
  date: string
  rows: MatchAssignmentInput[]
  plans: MatchPlanInput[]
  origin: string | null
  savedAt: number
}

type Handler = (update: AssignmentsUpdate) => void

const subscribersByDate = new Map<string, Set<Handler>>()

export function subscribe(date: string, handler: Handler): () => void {
  let set = subscribersByDate.get(date)
  if (!set) {
    set = new Set()
    subscribersByDate.set(date, set)
  }
  set.add(handler)
  return () => {
    const current = subscribersByDate.get(date)
    if (!current) return
    current.delete(handler)
    if (current.size === 0) subscribersByDate.delete(date)
  }
}

export function publish(update: AssignmentsUpdate): void {
  const set = subscribersByDate.get(update.date)
  if (!set || set.size === 0) return
  for (const handler of set) {
    try {
      handler(update)
    } catch {
      // subscribers must not break each other
    }
  }
}

export function subscriberCount(date: string): number {
  return subscribersByDate.get(date)?.size ?? 0
}
