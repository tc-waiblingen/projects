import { getDb } from '@/lib/db'
import { liveKitApiUrl } from '@/lib/livekit'
import { NextResponse } from 'next/server'

export function GET() {
  const database = checkDatabase()
  const livekit = checkLiveKit()
  const auth = checkAuth()
  const ok = database.ok && livekit.configured && auth.ready

  return NextResponse.json(
    {
      ok,
      database,
      livekit,
      auth,
    },
    { status: ok ? 200 : 503 },
  )
}

function checkDatabase() {
  try {
    getDb().prepare('SELECT 1').get()
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

function checkLiveKit() {
  const required = process.env.NODE_ENV === 'production'
  const urlConfigured = Boolean(process.env.LIVEKIT_URL)
  const apiKeyConfigured = Boolean(process.env.LIVEKIT_API_KEY)
  const apiSecretConfigured = Boolean(process.env.LIVEKIT_API_SECRET)
  const apiUrlValid = isLiveKitUrlValid(process.env.LIVEKIT_URL)
  const urlUsesWss = isLiveKitUrlWss(process.env.LIVEKIT_URL)

  return {
    configured: urlConfigured && apiKeyConfigured && apiSecretConfigured && apiUrlValid && (!required || urlUsesWss),
    required,
    urlConfigured,
    apiKeyConfigured,
    apiSecretConfigured,
    apiUrlValid,
    urlUsesWss,
  }
}

function checkAuth() {
  const required = process.env.NODE_ENV === 'production'
  const sessionSecret = process.env.PRESENT_SESSION_SECRET
  const publicUrlConfigured = Boolean(process.env.PRESENT_PUBLIC_URL)
  const publicUrlValid = isPublicUrlValid(process.env.PRESENT_PUBLIC_URL)
  const publicUrlUsesHttps = isPublicUrlHttps(process.env.PRESENT_PUBLIC_URL)
  const sessionSecretConfigured = Boolean(sessionSecret)
  const sessionSecretStrong = typeof sessionSecret === 'string' && sessionSecret.length >= 32
  const entraTenantConfigured = Boolean(process.env.ENTRA_TENANT_ID)
  const entraTenantSpecific = isEntraTenantSpecific(process.env.ENTRA_TENANT_ID)
  const entraClientConfigured = Boolean(process.env.ENTRA_CLIENT_ID)
  const entraClientSecretConfigured = Boolean(process.env.ENTRA_CLIENT_SECRET)
  const configured =
    publicUrlConfigured &&
    publicUrlValid &&
    (!required || publicUrlUsesHttps) &&
    sessionSecretStrong &&
    entraTenantConfigured &&
    (!required || entraTenantSpecific) &&
    entraClientConfigured &&
    entraClientSecretConfigured

  return {
    ready: !required || configured,
    required,
    publicUrlConfigured,
    publicUrlValid,
    publicUrlUsesHttps,
    sessionSecretConfigured,
    sessionSecretStrong,
    entraTenantConfigured,
    entraTenantSpecific,
    entraClientConfigured,
    entraClientSecretConfigured,
  }
}

function isLiveKitUrlValid(url: string | undefined): boolean {
  if (!url) return false
  try {
    liveKitApiUrl(url)
    return true
  } catch {
    return false
  }
}

function isLiveKitUrlWss(url: string | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).protocol === 'wss:'
  } catch {
    return false
  }
}

function isPublicUrlValid(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function isPublicUrlHttps(url: string | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

function isEntraTenantSpecific(tenantId: string | undefined): boolean {
  if (!tenantId) return false
  const normalized = tenantId.trim().toLowerCase()
  if (!normalized) return false
  return !['common', 'organizations', 'consumers', '{tenantid}', 'unknown', 'tenant-id', '<tenant-id>'].includes(normalized)
}
