export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown }

export async function settle<T>(p: Promise<T>): Promise<FetchResult<T>> {
  try {
    return { ok: true, data: await p }
  } catch (error) {
    console.error('External fetch failed:', error)
    return { ok: false, error }
  }
}
