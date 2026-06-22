import { describe, expect, it } from 'vitest'
import { readMediaPath } from '../livekit-stats'

function statsReport(
  entries: [string, Record<string, unknown>][],
): RTCStatsReport {
  return new Map(entries) as unknown as RTCStatsReport
}

describe('livekit stats helpers', () => {
  it('reads the selected UDP candidate pair from the transport stat', () => {
    const outbound = { transportId: 'transport' }
    const report = statsReport([
      ['transport', { type: 'transport', selectedCandidatePairId: 'pair' }],
      [
        'pair',
        {
          type: 'candidate-pair',
          localCandidateId: 'local',
          remoteCandidateId: 'remote',
        },
      ],
      [
        'local',
        { type: 'local-candidate', protocol: 'udp', candidateType: 'host' },
      ],
      [
        'remote',
        { type: 'remote-candidate', protocol: 'udp', candidateType: 'prflx' },
      ],
    ])

    expect(readMediaPath(report, outbound)).toBe('UDP host -> prflx')
  })

  it('falls back to a selected candidate pair stat', () => {
    const inbound = {}
    const report = statsReport([
      [
        'pair',
        {
          type: 'candidate-pair',
          selected: true,
          localCandidateId: 'local',
          remoteCandidateId: 'remote',
        },
      ],
      [
        'local',
        { type: 'local-candidate', protocol: 'tcp', candidateType: 'host' },
      ],
      [
        'remote',
        { type: 'remote-candidate', protocol: 'tcp', candidateType: 'host' },
      ],
    ])

    expect(readMediaPath(report, inbound)).toBe('TCP host -> host')
  })
})
