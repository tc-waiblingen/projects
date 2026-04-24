import type { DirectusFile, Global } from '@/types/directus-schema'
import { readSingleton } from '@directus/sdk'
import { getDirectus } from './client'

export async function fetchGlobalAreaMapId(): Promise<string | null> {
  try {
    const { directus } = getDirectus()
    const data = await directus.request(readSingleton('global', { fields: ['area_map'] }))
    const field = (data as Partial<Global>).area_map as DirectusFile | string | null | undefined
    return typeof field === 'string' ? field : (field?.id ?? null)
  } catch (error) {
    console.error('fetchGlobalAreaMapId failed:', error)
    return null
  }
}
