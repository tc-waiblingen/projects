export type ExternalSource = 'courts' | 'matches' | 'events' | 'tournament'
export type BannerVariant = 'block' | 'inline'

export interface SourceErrorCopy {
  title: string
  body: string
}

const BLOCK: Record<ExternalSource, SourceErrorCopy> = {
  courts: {
    title: 'Platzdaten nicht verfügbar.',
    body: 'Die Platzdaten konnten nicht geladen werden, Platzzuweisungen sind aktuell nicht möglich.',
  },
  matches: {
    title: 'Spiele nicht verfügbar.',
    body: 'Spielplan-Quelle ist derzeit nicht erreichbar.',
  },
  events: {
    title: 'Kalender nicht verfügbar.',
    body: 'Spiel- und Vereinstermine konnten nicht geladen werden.',
  },
  tournament: {
    title: 'Turnier-Status unbekannt.',
    body: 'Turnier-Information konnte nicht geladen werden.',
  },
}

const INLINE: Partial<Record<ExternalSource, SourceErrorCopy>> = {
  tournament: {
    title: '',
    body: 'Turnier-Status konnte nicht geprüft werden.',
  },
}

export function sourceErrorMessage(source: ExternalSource, variant: BannerVariant = 'block'): SourceErrorCopy {
  if (variant === 'inline') {
    const inline = INLINE[source]
    if (inline) return inline
  }
  return BLOCK[source]
}
