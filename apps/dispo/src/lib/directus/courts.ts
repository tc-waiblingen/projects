import { getDirectus } from './client'

export interface DispoCourt {
  id: number
  name: string
  type: 'tennis_indoor' | 'tennis_outdoor'
  sort: number
}

export async function fetchCourts(): Promise<DispoCourt[]> {
  const { directus, readItems } = getDirectus()
  const items = await directus.request(
    readItems('courts', {
      filter: { status: { _eq: 'published' } },
      sort: ['sort'],
      fields: ['id', 'name', 'type', 'sort'],
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
    })
  }
  courts.sort((a, b) => a.sort - b.sort || a.id - b.id)
  return courts
}
