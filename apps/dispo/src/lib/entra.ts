import * as client from 'openid-client'
import type { Role } from './auth'

export const PKCE_COOKIE = 'entra_pkce'
export const STATE_COOKIE = 'entra_state'
export const NONCE_COOKIE = 'entra_nonce'
export const NEXT_COOKIE = 'entra_next'
export const TEMP_MAX_AGE_SECONDS = 60 * 10

interface EntraEnv {
  tenantId: string
  clientId: string
  clientSecret: string
  adminRole: string
}

function readEnv(): EntraEnv {
  const tenantId = process.env.ENTRA_TENANT_ID
  const clientId = process.env.ENTRA_CLIENT_ID
  const clientSecret = process.env.ENTRA_CLIENT_SECRET
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('ENTRA_TENANT_ID, ENTRA_CLIENT_ID and ENTRA_CLIENT_SECRET must be set')
  }
  return {
    tenantId,
    clientId,
    clientSecret,
    adminRole: process.env.ENTRA_ADMIN_ROLE ?? 'Dispo.Admin',
  }
}

let configPromise: Promise<{ config: client.Configuration; env: EntraEnv }> | null = null

function getConfig(): Promise<{ config: client.Configuration; env: EntraEnv }> {
  if (!configPromise) {
    const env = readEnv()
    const issuer = new URL(`https://login.microsoftonline.com/${env.tenantId}/v2.0`)
    configPromise = client.discovery(issuer, env.clientId, env.clientSecret).then((config) => ({ config, env }))
  }
  return configPromise
}

export interface AuthRequest {
  url: string
  codeVerifier: string
  state: string
  nonce: string
}

export async function buildAuthRequest(redirectUri: string): Promise<AuthRequest> {
  const { config } = await getConfig()
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: 'openid profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })
  return { url: url.toString(), codeVerifier, state, nonce }
}

export interface EntraIdentity {
  sub: string
  role: Role
}

export async function exchangeCallback(params: {
  callbackUrl: URL
  codeVerifier: string
  expectedState: string
  expectedNonce: string
}): Promise<EntraIdentity> {
  const { config, env } = await getConfig()
  const tokens = await client.authorizationCodeGrant(config, params.callbackUrl, {
    pkceCodeVerifier: params.codeVerifier,
    expectedState: params.expectedState,
    expectedNonce: params.expectedNonce,
    idTokenExpected: true,
  })
  const claims = tokens.claims()
  if (!claims || typeof claims.sub !== 'string') {
    throw new Error('ID token missing subject claim')
  }
  const roles = Array.isArray(claims.roles) ? (claims.roles as unknown[]).filter((r): r is string => typeof r === 'string') : []
  const role: Role = roles.includes(env.adminRole) ? 'admin' : 'operator'
  return { sub: `entra:${claims.sub}`, role }
}
