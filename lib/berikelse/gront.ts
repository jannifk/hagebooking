import { BerikelseResultat, Koordinater, medCache } from './types'

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

async function hentFraOverpass(body: string): Promise<Response> {
  let sisteFeil: Error | null = null
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) return res
      sisteFeil = new Error(`Overpass ${res.status}`)
    } catch (err) {
      sisteFeil = err as Error
    }
  }
  throw sisteFeil ?? new Error('Alle Overpass-speil feilet')
}

export async function hentGrontJustering(k: Koordinater): Promise<BerikelseResultat> {
  return medCache('gront', k, async () => {
    // Søk etter parker/skog/lekeplasser innen 500 m
    const q = `
      [out:json][timeout:25];
      (
        way(around:500,${k.lat},${k.lng})["leisure"="park"];
        way(around:500,${k.lat},${k.lng})["landuse"="forest"];
        way(around:500,${k.lat},${k.lng})["leisure"="nature_reserve"];
        way(around:200,${k.lat},${k.lng})["leisure"="playground"];
      );
      out center 30;
    `
    const res = await hentFraOverpass(`data=${encodeURIComponent(q)}`)
    const data = await res.json()
    const elementer: Array<{ tags?: Record<string, string>; center?: { lat: number; lon: number } }> =
      data?.elements ?? []
    if (elementer.length === 0) return null

    const harPark = elementer.some(e => e.tags?.leisure === 'park')
    const harSkog = elementer.some(e => e.tags?.landuse === 'forest' || e.tags?.leisure === 'nature_reserve')
    const harLek = elementer.some(e => e.tags?.leisure === 'playground')

    let prosent = 0
    const deler: string[] = []
    if (harSkog) {
      prosent += 2
      deler.push('marka/skog <500 m')
    } else if (harPark) {
      prosent += 1
      deler.push('park <500 m')
    }
    if (harLek && prosent < 2) {
      prosent += 1
      deler.push('lekeplass <200 m')
    }

    if (prosent === 0) return null

    return {
      navn: 'Grøntområder',
      beskrivelse: deler.join(', '),
      justeringsProsent: prosent,
      brukt: true,
      kategori: 'miljo',
      kilde: 'OpenStreetMap',
    }
  })
}
