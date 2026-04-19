const DEFAULT_SITE_URL = 'https://tc-waiblingen.de'

export function getSiteBaseUrl(globalsWebsite?: string | null): string {
  const raw = globalsWebsite || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}
