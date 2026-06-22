export function readMediaPath(
  report: RTCStatsReport,
  mediaStat: Record<string, unknown>,
): string {
  const pair = findSelectedCandidatePair(report, mediaStat)
  if (!pair) return 'Resolving'

  const local = findCandidateStats(report, pair.localCandidateId)
  const remote = findCandidateStats(report, pair.remoteCandidateId)
  const protocol = (
    readString(local?.protocol) ||
    readString(remote?.protocol) ||
    readString(pair.protocol) ||
    'unknown'
  ).toUpperCase()
  const localType = readString(local?.candidateType) || 'local'
  const remoteType = readString(remote?.candidateType) || 'remote'
  const relayProtocol = readString(local?.relayProtocol)

  return [protocol, `${localType} -> ${remoteType}`, relayProtocol]
    .filter(Boolean)
    .join(' ')
}

function findSelectedCandidatePair(
  report: RTCStatsReport,
  mediaStat: Record<string, unknown>,
): Record<string, unknown> | null {
  const transportId =
    typeof mediaStat.transportId === 'string'
      ? mediaStat.transportId
      : undefined
  const transport = transportId
    ? (report.get(transportId) as Record<string, unknown> | undefined)
    : undefined
  const selectedPairId =
    typeof transport?.selectedCandidatePairId === 'string'
      ? transport.selectedCandidatePairId
      : undefined
  if (selectedPairId) {
    const selected = report.get(selectedPairId) as
      | Record<string, unknown>
      | undefined
    if (selected?.type === 'candidate-pair') return selected
  }

  let fallback: Record<string, unknown> | null = null
  report.forEach((entry) => {
    const stat = entry as Record<string, unknown>
    if (stat.type !== 'candidate-pair') return
    if (stat.selected === true) {
      fallback = stat
      return
    }
    if (
      !fallback &&
      stat.nominated === true &&
      stat.state === 'succeeded'
    ) {
      fallback = stat
    }
  })
  return fallback
}

function findCandidateStats(
  report: RTCStatsReport,
  candidateId: unknown,
): Record<string, unknown> | undefined {
  if (typeof candidateId !== 'string') return undefined
  return report.get(candidateId) as Record<string, unknown> | undefined
}

function readString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}
