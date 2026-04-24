import { getDirectus } from './client'

export interface DispoCourt {
  id: number
  name: string
  type: 'tennis_indoor' | 'tennis_outdoor'
  sort: number
  ebusyId: string | null
}

export async function fetchCourts(): Promise<DispoCourt[]> {
  const { directus, readItems } = getDirectus()
  const items = await directus.request(
    readItems('courts', {
      filter: { status: { _eq: 'published' } },
      sort: ['sort'],
      fields: ['id', 'name', 'type', 'sort', 'ebusy_id'],
    }),
  )

  const courts: DispoCourt[] = []
  for (const item of items) {
    if (typeof item.id !== 'number') continue
    if (item.type !== 'tennis_indoor' && item.type !== 'tennis_outdoor') continue
    courts.push({
      id: item.id,
      name: item.name ?? `Platz ${item.id}`,
      type: item.type,
      sort: item.sort ?? item.id,
      ebusyId: typeof item.ebusy_id === 'string' && item.ebusy_id.length > 0 ? item.ebusy_id : null,
    })
  }
  courts.sort((a, b) => a.sort - b.sort || a.id - b.id)
  return courts
}
