/**
 * Client for the nuliga-reader service (https://nr.tc-waiblingen.de).
 * See OpenAPI spec at https://nr.tc-waiblingen.de/openapi.json
 */

export interface NrMatch {
  id: string
  teamId: string
  clubId: string
  season: string
  league: string
  matchDate: string
  homeTeam: string
  awayTeam: string
  isHome: boolean
  lastRefreshedAt: string
  matchTime?: string
  location?: string
  result?: string
  district?: string
  leagueFull?: string
  leagueUrl?: string
  homeTeamUrl?: string
  awayTeamUrl?: string
  reportUrl?: string
}

export interface NrTournament {
  id: string
  clubId: string
  title: string
  dateStart: string
  lastRefreshedAt: string
  dateEnd?: string
  location?: string
  category?: string
  entryFee?: string
  registrationDeadline?: string
  registrationUrl?: string
  callForEntriesUrl?: string
}

export interface NrListMatchesResponse {
  items: NrMatch[]
  lastRefreshedAt: string
}

export interface NrListTournamentsResponse {
  items: NrTournament[]
  lastRefreshedAt: string
}

export class NrConfigError extends Error {
  constructor(missing: string) {
    super(`nuliga-reader env var not set: ${missing}`)
    this.name = 'NrConfigError'
  }
}

interface NrConfig {
  baseUrl: string
  token: string
  clubId: string
}

function readConfig(): NrConfig {
  const baseUrl = process.env.NR_API_URL
  const token = process.env.NR_API_TOKEN
  const clubId = process.env.NR_CLUB_ID
  if (!baseUrl) throw new NrConfigError('NR_API_URL')
  if (!token) throw new NrConfigError('NR_API_TOKEN')
  if (!clubId) throw new NrConfigError('NR_CLUB_ID')
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token, clubId }
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function nrGet<T>(
  path: string,
  params: Record<string, string>,
  revalidateSeconds: number,
): Promise<T> {
  const config = readConfig()
  const url = new URL(`${config.baseUrl}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
    next: { revalidate: revalidateSeconds },
  } as RequestInit)

  if (!response.ok) {
    throw new Error(
      `nuliga-reader ${path} failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as T
}

export async function fetchNrMatches(from: Date, to: Date): Promise<NrMatch[]> {
  const config = readConfig()
  const data = await nrGet<NrListMatchesResponse>(
    `/v1/clubs/${encodeURIComponent(config.clubId)}/matches`,
    { from: formatDate(from), to: formatDate(to) },
    86400,
  )
  return data.items
}

export async function fetchNrTournaments(
  from: Date,
  to: Date,
): Promise<NrTournament[]> {
  const config = readConfig()
  const data = await nrGet<NrListTournamentsResponse>(
    `/v1/clubs/${encodeURIComponent(config.clubId)}/tournaments`,
    { from: formatDate(from), to: formatDate(to) },
    14400,
  )
  return data.items
}

export const _nrTestHelpers = {
  formatDate,
}
