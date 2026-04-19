import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

let cache: Promise<OgAssets> | null = null

export interface OgAssets {
  crestDataUri: string
}

async function load(): Promise<OgAssets> {
  const publicDir = join(process.cwd(), 'public')
  const crestBytes = await readFile(join(publicDir, 'assets/logo/tcw-crest.png'))
  return {
    crestDataUri: `data:image/png;base64,${crestBytes.toString('base64')}`,
  }
}

export function getOgAssets(): Promise<OgAssets> {
  if (!cache) cache = load()
  return cache
}
