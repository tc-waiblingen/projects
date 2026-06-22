import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(currentDir, '../..')
const scriptPath = resolve(appRoot, 'scripts/production-evidence.mjs')
const passedManualEvidencePath = resolve(
  appRoot,
  'scripts/fixtures/production-manual-evidence.passed.json',
)

function runProductionEvidence(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, '--', ...args], {
    cwd: appRoot,
    encoding: 'utf8',
  })
}

describe('production evidence CLI', () => {
  it('accepts a complete production evidence bundle', () => {
    const entraPath = writeReport(entraEvidence({ tenant: 'abcd1234-tenant' }))
    const endpointPath = writeReport(endpointEvidence())
    const browserPath = writeReport(
      browserEvidence({
        baseUrl: 'https://present.tc-waiblingen.de',
        browserMode: 'headed',
        moderatorAuthMode: 'interactive',
      }),
    )
    const nativePath = writeReport(
      nativePickerEvidence({
        baseUrl: 'https://present.tc-waiblingen.de',
        moderatorAuthMode: 'interactive',
        secretLeakCheck: true,
      }),
    )

    const result = runProductionEvidence([
      '--entra',
      entraPath,
      '--endpoint',
      endpointPath,
      '--browser',
      browserPath,
      '--native',
      nativePath,
      '--manual',
      passedManualEvidencePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('entra:passed')
    expect(result.stdout).toContain('endpoint:passed')
    expect(result.stdout).toContain('browser:passed')
    expect(result.stdout).toContain('native:passed')
    expect(result.stdout).toContain('manual:passed')
  })

  it('accepts completed manual evidence', () => {
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      passedManualEvidencePath,
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('manual:passed')
  })

  it('rejects pending manual evidence placeholders', () => {
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      '../../infra/livekit/production-manual-evidence.example.json',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Manual evidence result expected "passed", got "pending"',
    )
    expect(result.stderr).toContain('Manual evidence testedBy must be replaced')
    expect(result.stderr).toContain('same-lan status must be passed')
  })

  it('rejects placeholder unavailable-network reasons', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    const tcpFallback = report.networkChecks.find(
      check => check.name === 'tcp-fallback',
    )
    if (!tcpFallback) throw new Error('fixture missing tcp-fallback check')
    tcpFallback.status = 'not_available'
    tcpFallback.observedProtocol = ''
    tcpFallback.moderatorMediaObserved = false
    tcpFallback.viewerMediaObserved = false
    tcpFallback.reason = 'replace if unavailable'

    const filePath = resolve(
      mkdtempSync(resolve(tmpdir(), 'present-evidence-')),
      'manual.json',
    )
    writeFileSync(filePath, JSON.stringify(report))

    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'tcp-fallback not-available reason must be replaced',
    )
  })

  it('rejects missing physical QR URL evidence', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    delete report.physicalQrScan.expectedUrl
    delete report.physicalQrScan.scannedUrl

    const filePath = writeReport(report)
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Physical QR expected URL must be present')
    expect(result.stderr).toContain('Physical QR scanned URL must be present')
  })

  it('rejects physical QR URLs that do not match the presentation code', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    report.physicalQrScan.expectedUrl = 'https://present.tc-waiblingen.de/p/WAI-9999'
    report.physicalQrScan.scannedUrl = 'https://present.tc-waiblingen.de/p/WAI-9999'

    const filePath = writeReport(report)
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Physical QR expected URL expected "https://present.tc-waiblingen.de/p/WAI-0426"',
    )
    expect(result.stderr).toContain(
      'Physical QR scanned URL expected "https://present.tc-waiblingen.de/p/WAI-0426"',
    )
  })

  it('rejects placeholder manual notes', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    report.notes = ['replace with production note']

    const filePath = writeReport(report)
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Manual note 1 must be replaced')
  })

  it('rejects secret-like manual notes', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    report.notes = ['present_session=abc123 must not be recorded']

    const filePath = writeReport(report)
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Manual note 1 must not contain secrets, session cookies, or tokens',
    )
  })

  it('rejects password-like manual notes', () => {
    const report = structuredClone(
      JSON.parse(
        readFileSync(passedManualEvidencePath, 'utf8'),
      ) as ProductionManualEvidence,
    )
    report.notes = ['viewer password=Summer2026 must not be recorded']

    const filePath = writeReport(report)
    const result = runProductionEvidence([
      '--allow-partial',
      '--manual',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Manual note 1 must not contain secrets, session cookies, or tokens',
    )
  })

  it('accepts native-picker evidence with secret scanning', () => {
    const filePath = writeReport(nativePickerEvidence({ secretLeakCheck: true }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--native',
      filePath,
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('native:passed')
  })

  it('rejects native-picker evidence without secret scanning', () => {
    const filePath = writeReport(nativePickerEvidence({ secretLeakCheck: false }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--native',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Native picker secret leak check enabled must be true')
    expect(result.stderr).toContain('Native picker secret value markers scanned expected >= 1')
  })

  it('rejects native-picker evidence without pre-live viewer proof', () => {
    const filePath = writeReport({
      ...nativePickerEvidence({ secretLeakCheck: true }),
      viewerWaitingBeforeLive: false,
      viewerTokenRejectedBeforeLive: false,
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--native',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Production native-picker smoke viewer waited before live must be true')
    expect(result.stderr).toContain('Production native-picker smoke viewer token rejected before live must be true')
  })

  it('rejects native-picker evidence with unresolved media paths', () => {
    const report = nativePickerEvidence({ secretLeakCheck: true })
    report.mediaPath = 'Waiting'
    report.viewerMediaPaths = ['Unavailable']
    const filePath = writeReport(report)

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--native',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Native picker moderator media path must be resolved')
    expect(result.stderr).toContain('Native picker viewer 1 media path must be resolved')
  })

  it('accepts tenant-specific Entra preflight evidence', () => {
    const filePath = writeReport(entraEvidence({ tenant: 'abcd1234-tenant' }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--entra',
      filePath,
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('entra:passed')
  })

  it('rejects common-tenant Entra preflight evidence', () => {
    const filePath = writeReport(entraEvidence({ tenant: 'common' }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--entra',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Entra tenant ID must come from the production Entra app')
    expect(result.stderr).toContain('Entra issuer must use a tenant-specific Entra endpoint')
    expect(result.stderr).toContain('Entra authorization endpoint must use a tenant-specific Entra endpoint')
  })

  it('accepts LiveKit endpoint evidence with masked credentials', () => {
    const filePath = writeReport(endpointEvidence())

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('endpoint:passed')
  })

  it('rejects LiveKit endpoint evidence with leaked tokens', () => {
    const filePath = writeReport({
      ...endpointEvidence(),
      apiKey: 'production-api-key',
      signalingUrl: 'wss://live.tc-waiblingen.de/rtc?access_token=eyJabc.def.ghi',
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('LiveKit API key must be masked')
    expect(result.stderr).toContain(
      'LiveKit endpoint evidence must not contain secrets or tokens',
    )
  })

  it('rejects LiveKit endpoint evidence for a different API URL', () => {
    const filePath = writeReport({
      ...endpointEvidence(),
      apiUrl: 'https://other-livekit.example.test',
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'LiveKit API URL expected "https://live.tc-waiblingen.de"',
    )
  })

  it('rejects LiveKit endpoint evidence for a different TCP fallback address', () => {
    const filePath = writeReport({
      ...endpointEvidence(),
      tcpFallbackHost: 'localhost',
      tcpFallbackPort: 443,
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'LiveKit TCP fallback host expected "live.tc-waiblingen.de", got "localhost"',
    )
    expect(result.stderr).toContain(
      'LiveKit TCP fallback port expected 7881, got 443',
    )
  })

  it('rejects LiveKit endpoint evidence whose report path does not include the room name', () => {
    const filePath = writeReport({
      ...endpointEvidence(),
      preflightReport: {
        path: '.tmp/livekit-endpoint-preflight-other-room.json',
      },
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'LiveKit endpoint report path must include room name "tcw-present-preflight-test"',
    )
  })

  it('accepts LiveKit endpoint evidence with a custom TCP fallback port', () => {
    const filePath = writeReport({
      ...endpointEvidence(),
      tcpFallbackPort: 443,
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--endpoint',
      filePath,
      '--tcp-fallback-port',
      '443',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('endpoint:passed')
  })

  it('accepts browser evidence with explicit media protocol proof', () => {
    const filePath = writeReport(browserEvidence())

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('browser:passed')
  })

  it('rejects browser evidence without a requested media protocol', () => {
    const filePath = writeReport(browserEvidence())

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Browser media protocol requires --protocol udp or tcp')
  })

  it('rejects browser evidence without pre-live viewer waiting proof', () => {
    const filePath = writeReport({
      ...browserEvidence(),
      viewerWaitingBeforeLive: false,
      viewerTokenRejectedBeforeLive: false,
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Production browser smoke viewer waited before live must be true')
    expect(result.stderr).toContain('Production browser smoke viewer token rejected before live must be true')
  })

  it('rejects browser evidence without run metadata', () => {
    const report = browserEvidence()
    delete report.code
    delete report.startedAt
    delete report.completedAt
    delete report.elapsedMs
    delete report.smokeReport
    const filePath = writeReport(report)

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Production browser smoke startedAt must be present')
    expect(result.stderr).toContain('Production browser smoke completedAt must be present')
    expect(result.stderr).toContain('Production browser smoke elapsedMs expected >= 1')
    expect(result.stderr).toContain('Production browser smoke report path must be present')
    expect(result.stderr).toContain('Browser presentation code must be present')
  })

  it('rejects browser evidence whose completion timestamp is before start', () => {
    const filePath = writeReport({
      ...browserEvidence(),
      completedAt: '2026-06-22T11:59:59.000Z',
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Production browser smoke completedAt must not be before startedAt',
    )
  })

  it('rejects browser evidence with mismatched token LiveKit URLs', () => {
    const filePath = writeReport({
      ...browserEvidence(),
      moderatorLiveKitUrl: 'ws://localhost:7880',
      viewerLiveKitUrl: 'ws://localhost:7880',
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Browser moderator LiveKit URL expected "wss://live.tc-waiblingen.de"',
    )
    expect(result.stderr).toContain(
      'Browser viewer LiveKit URL expected "wss://live.tc-waiblingen.de"',
    )
  })

  it('rejects browser evidence whose report path does not include the presentation code', () => {
    const filePath = writeReport({
      ...browserEvidence(),
      smokeReport: {
        path: '.tmp/present-smoke-SMK-OTHER.json',
      },
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Browser smoke report path must include presentation code "SMK-BROWSER"',
    )
  })

  it('rejects interactive browser evidence that did not run headed with auto picker mode', () => {
    const filePath = writeReport({
      ...browserEvidence({
        baseUrl: 'https://present.tc-waiblingen.de',
      }),
      browserMode: 'headless',
      moderatorAuthMode: 'interactive',
      pickerMode: 'native',
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Browser picker mode expected "auto", got "native"')
    expect(result.stderr).toContain('Browser interactive mode expected "headed", got "headless"')
  })

  it('rejects dev-auth browser evidence for a production base URL', () => {
    const filePath = writeReport(browserEvidence({
      baseUrl: 'https://present.tc-waiblingen.de',
    }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Production browser smoke dev auth is only allowed for local base URLs',
    )
  })

  it('accepts dev-auth browser evidence for an IPv6 loopback base URL', () => {
    const filePath = writeReport(browserEvidence({
      baseUrl: 'http://[::1]:3003',
    }))

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://[::1]:3003',
      '--browser',
      filePath,
      '--protocol',
      'udp',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('browser:passed')
  })

  it('rejects native-picker evidence whose report path does not include the presentation code', () => {
    const filePath = writeReport({
      ...nativePickerEvidence({ secretLeakCheck: true }),
      smokeReport: {
        path: '.tmp/present-smoke-SMK-OTHER.json',
      },
    })

    const result = runProductionEvidence([
      '--allow-partial',
      '--allow-dev-auth',
      '--base-url',
      'http://localhost:3003',
      '--native',
      filePath,
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Native picker smoke report path must include presentation code "SMK-NATIVE"',
    )
  })
})

function writeReport(report: unknown): string {
  const filePath = resolve(
    mkdtempSync(resolve(tmpdir(), 'present-evidence-')),
    'report.json',
  )
  writeFileSync(filePath, JSON.stringify(report))
  return filePath
}

function nativePickerEvidence({
  baseUrl = 'http://localhost:3003',
  moderatorAuthMode = 'dev',
  secretLeakCheck,
}: {
  baseUrl?: string
  moderatorAuthMode?: string
  secretLeakCheck: boolean
}): Record<string, unknown> {
  return {
    baseUrl,
    browserMode: 'headed',
    code: 'SMK-NATIVE',
    completedAt: '2026-06-22T12:00:10.000Z',
    elapsedMs: 10_000,
    mediaPath: 'UDP host -> prflx',
    mode: 'screen-share',
    moderatorAuthMode,
    moderatorConnected: true,
    moderatorDiagnostics: true,
    moderatorLiveKitUrl: 'wss://live.tc-waiblingen.de',
    noLiveKitSecretLeak: secretLeakCheck,
    pickerMode: 'native',
    presentationEnded: true,
    result: 'passed',
    screenCaptureMode: 'real',
    screenChanged: true,
    screenPublished: true,
    secretCredentialMarkersScanned: secretLeakCheck ? 5 : 0,
    secretLeakCheck,
    secretValueMarkersScanned: secretLeakCheck ? 1 : 0,
    smokeReport: {
      path: '.tmp/present-smoke-SMK-NATIVE.json',
    },
    startedAt: '2026-06-22T12:00:00.000Z',
    viewerConnected: true,
    viewerCount: true,
    viewerEnded: true,
    viewerLiveKitUrl: 'wss://live.tc-waiblingen.de',
    viewerMediaPaths: ['UDP host -> prflx'],
    viewerReceivedScreen: true,
    viewerTargetCount: 1,
    viewerTokenRejectedBeforeLive: true,
    viewerTokenRejectedAfterEnd: true,
    viewerWaitingBeforeLive: true,
  }
}

function browserEvidence({
  baseUrl = 'http://localhost:3003',
  browserMode = 'headless',
  moderatorAuthMode = 'dev',
}: {
  baseUrl?: string
  browserMode?: string
  moderatorAuthMode?: string
} = {}): Record<string, unknown> {
  return {
    baseUrl,
    browserMode,
    code: 'SMK-BROWSER',
    completedAt: '2026-06-22T12:00:10.000Z',
    elapsedMs: 10_000,
    expectedMediaProtocol: 'UDP',
    mediaPath: 'UDP host -> prflx',
    mediaProtocolMatched: true,
    mode: 'screen-share',
    moderatorAuthMode,
    moderatorConnected: true,
    moderatorDiagnostics: true,
    moderatorLiveKitUrl: 'wss://live.tc-waiblingen.de',
    moderatorRefreshSurvived: true,
    noLiveKitSecretLeak: true,
    pickerMode: 'auto',
    presentationEnded: true,
    refreshMode: true,
    result: 'passed',
    screenCaptureMode: 'fake',
    screenChanged: true,
    screenPublished: true,
    screenRestarted: true,
    screenStopped: true,
    secretCredentialMarkersScanned: 5,
    secretLeakCheck: true,
    secretValueMarkersScanned: 1,
    smokeReport: {
      path: '.tmp/present-smoke-SMK-BROWSER.json',
    },
    startedAt: '2026-06-22T12:00:00.000Z',
    stopRestartMode: true,
    viewerConnected: true,
    viewerCount: true,
    viewerEnded: true,
    viewerLiveKitUrl: 'wss://live.tc-waiblingen.de',
    viewerMediaPaths: [
      'UDP host -> prflx',
      'UDP host -> prflx',
      'UDP host -> prflx',
      'UDP host -> prflx',
      'UDP host -> prflx',
    ],
    viewerReceivedScreen: true,
    viewerRefreshSurvived: true,
    viewerReturnedToWaiting: true,
    viewerTargetCount: 5,
    viewerTokenRejectedBeforeLive: true,
    viewerTokenRejectedAfterEnd: true,
    viewerWaitingBeforeLive: true,
  }
}

function endpointEvidence(): Record<string, unknown> {
  return {
    apiKey: 'pr...ey',
    apiUrl: 'https://live.tc-waiblingen.de',
    completedAt: '2026-06-22T12:00:00.000Z',
    created: true,
    deleted: true,
    elapsedMs: 123,
    error: null,
    listed: true,
    liveKitUrl: 'wss://live.tc-waiblingen.de',
    preflightReport: {
      path: '.tmp/livekit-endpoint-preflight-tcw-present-preflight-test.json',
    },
    result: 'passed',
    roomName: 'tcw-present-preflight-test',
    signalingConnected: true,
    startedAt: '2026-06-22T11:59:59.000Z',
    tcpFallbackHost: 'live.tc-waiblingen.de',
    tcpFallbackPort: 7881,
    tcpFallbackReachable: true,
  }
}

function entraEvidence({
  tenant,
}: {
  tenant: 'abcd1234-tenant' | 'common'
}): Record<string, unknown> {
  const maskedTenant = tenant === 'common' ? '****' : 'abcd...nant'
  const issuerTenant = tenant === 'common' ? '{tenantid}' : tenant
  const endpointTenant = tenant

  return {
    authorizationEndpoint: `https://login.microsoftonline.com/${endpointTenant}/oauth2/v2.0/authorize`,
    checks: {
      authorizationEndpointDiscovered: true,
      authorizationUrlContainsClientId: true,
      authorizationUrlContainsRedirectUri: true,
      authorizationUrlUsesCodeFlow: true,
      authorizationUrlUsesDiscoveredEndpoint: true,
      authorizationUrlUsesOpenIdProfileScope: true,
      authorizationUrlUsesPkce: true,
      authorizationUrlUsesStateAndNonce: true,
      issuerDiscovered: true,
      jwksUriDiscovered: true,
      tokenEndpointDiscovered: true,
    },
    clientId: tenant === 'common' ? '0000...0000' : '1234...5678',
    completedAt: '2026-06-22T12:00:01.000Z',
    elapsedMs: 1_000,
    issuer: `https://login.microsoftonline.com/${issuerTenant}/v2.0`,
    jwksUri: `https://login.microsoftonline.com/${endpointTenant}/discovery/v2.0/keys`,
    preflightReport: {
      path: '.tmp/entra-preflight-abcd-nant-1234-5678.json',
    },
    publicUrl: 'https://present.tc-waiblingen.de',
    redirectUri: 'https://present.tc-waiblingen.de/api/auth/entra/callback',
    result: 'passed',
    startedAt: '2026-06-22T12:00:00.000Z',
    tenantId: maskedTenant,
    tokenEndpoint: `https://login.microsoftonline.com/${endpointTenant}/oauth2/v2.0/token`,
  }
}

interface ProductionManualEvidence {
  physicalQrScan: {
    expectedUrl?: string
    scannedUrl?: string
  }
  networkChecks: Array<{
    name: string
    status: string
    observedProtocol?: string
    moderatorMediaObserved?: boolean
    viewerMediaObserved?: boolean
    reason?: string
  }>
  notes?: string[]
}
