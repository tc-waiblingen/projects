interface DispoTodayMatch {
  matchId: string
  courts: { id: number; name: string }[]
}

interface DispoTodayResponse {
  matches: DispoTodayMatch[]
}

export async function fetchTodayCourtAssignments(): Promise<Map<string, string[]>> {
  const baseUrl = process.env.DISPO_API_URL
  if (!baseUrl) {
    console.warn('Dispo config missing env var: DISPO_API_URL')
    return new Map()
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/today`

  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      console.error('Dispo API error:', response.status, await response.text())
      return new Map()
    }
    const data = (await response.json()) as DispoTodayResponse
    const map = new Map<string, string[]>()
    for (const m of data.matches ?? []) {
      const names = (m.courts ?? []).map((c) => c.name).sort((a, b) => a.localeCompare(b, 'de'))
      map.set(m.matchId, names)
    }
    return map
  } catch (error) {
    console.error('Failed to fetch dispo court assignments:', error)
    return new Map()
  }
}
