import { BerikelseResultat, Koordinater, medCache } from './types'

const ENTUR_GEOCODER = 'https://api.entur.io/geocoder/v1/reverse'
const CLIENT_NAME = 'boligverdi-mvp'

interface PeliasFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    distance?: number // km
    category?: string[]
    mode?: Array<Record<string, unknown>>
  }
}

export async function hentEnturJustering(k: Koordinater): Promise<BerikelseResultat> {
  return medCache('entur', k, async () => {
    const params = new URLSearchParams({
      'point.lat': k.lat.toString(),
      'point.lon': k.lng.toString(),
      size: '30',
      layers: 'venue',
      'boundary.circle.radius': '1', // km
    })
    const res = await fetch(`${ENTUR_GEOCODER}?${params}`, {
      headers: { 'ET-Client-Name': CLIENT_NAME },
    })
    if (!res.ok) throw new Error(`Entur ${res.status}`)
    const data: { features?: PeliasFeature[] } = await res.json()
    const features = data.features ?? []
    if (features.length === 0) return null

    const skinnetyper = new Set(['onstreetTram', 'tram', 'metro', 'rail', 'railStation'])
    const busstyper = new Set(['onstreetBus', 'bus', 'busStation'])

    const harKategori = (f: PeliasFeature, set: Set<string>) =>
      (f.properties.category ?? []).some(c => set.has(c))

    const skinne = features
      .filter(f => harKategori(f, skinnetyper))
      .sort((a, b) => (a.properties.distance ?? 99) - (b.properties.distance ?? 99))[0]
    const buss = features
      .filter(f => harKategori(f, busstyper))
      .sort((a, b) => (a.properties.distance ?? 99) - (b.properties.distance ?? 99))[0]

    let prosent = 0
    const deler: string[] = []

    if (skinne?.properties.distance !== undefined) {
      const m = Math.round(skinne.properties.distance * 1000)
      if (m < 400) {
        prosent += 5
        deler.push(`${skinne.properties.name ?? 'T-bane/trikk'} ${m} m`)
      } else if (m < 800) {
        prosent += 3
        deler.push(`${skinne.properties.name ?? 'T-bane/trikk'} ${m} m`)
      }
    }
    if (buss?.properties.distance !== undefined) {
      const m = Math.round(buss.properties.distance * 1000)
      if (m < 300) {
        prosent += 1
        deler.push(`buss ${m} m`)
      }
    }

    if (prosent === 0) return null

    return {
      navn: 'Kollektiv-nærhet',
      beskrivelse: deler.join(', '),
      justeringsProsent: prosent,
      brukt: true,
      kategori: 'transport',
      kilde: 'Entur',
    }
  })
}
