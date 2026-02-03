interface PagefindResult {
  id: string
  url: string
  meta: {
    title?: string
  }
  excerpt: string
}

interface PagefindSearch {
  results: Array<{ data: () => Promise<PagefindResult> }>
}

interface Pagefind {
  init: () => Promise<void>
  search: (query: string) => Promise<PagefindSearch>
}

let pagefind: Pagefind | null = null
let loadingPromise: Promise<Pagefind | null> | null = null

export async function getPagefind(): Promise<Pagefind | null> {
  if (typeof window === 'undefined') return null

  if (pagefind) return pagefind

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      // Use Function constructor to create a dynamic import that bypasses bundler analysis
      // This is necessary because Next.js/Turbopack tries to resolve imports at build time
      const dynamicImport = new Function('path', 'return import(path)')
      const pagefindModule = await dynamicImport('/_pagefind/pagefind.js')
      pagefind = pagefindModule as unknown as Pagefind
      await pagefind.init()
      return pagefind
    } catch (error) {
      console.error('Failed to load Pagefind:', error)
      loadingPromise = null
      return null
    }
  })()

  return loadingPromise
}

export type { PagefindResult, PagefindSearch, Pagefind }
