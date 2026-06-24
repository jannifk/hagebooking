import { Justeringsfaktor } from '@/types'

export interface Koordinater {
  lat: number
  lng: number
}

export type BerikelseResultat = Justeringsfaktor | null

export function haversineMeter(a: Koordinater, b: Koordinater): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const cache = new Map<string, BerikelseResultat>()

export function cacheKey(kilde: string, k: Koordinater): string {
  return `${kilde}:${k.lat.toFixed(4)},${k.lng.toFixed(4)}`
}

export async function medCache(
  kilde: string,
  k: Koordinater,
  hent: () => Promise<BerikelseResultat>
): Promise<BerikelseResultat> {
  const key = cacheKey(kilde, k)
  if (cache.has(key)) return cache.get(key) ?? null
  try {
    const res = await hent()
    cache.set(key, res)
    return res
  } catch (err) {
    console.error(`[berikelse:${kilde}] feilet:`, err)
    return null
  }
}
