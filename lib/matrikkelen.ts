import { MatrikkelEiendom } from '@/types'

// Kartverkets adresse-API for å slå opp gnr/bnr fra adresse
// Docs: https://ws.geonorge.no/adresser/v1/
const ADRESSE_API = 'https://ws.geonorge.no/adresser/v1'

interface GeonorgeAdressetreff {
  adressetekst: string
  postnummer: string
  poststed: string
  kommunenavn: string
  gardsnummer: number
  bruksnummer: number
  representasjonspunkt?: {
    lat: number
    lon: number
  }
  bruksareal?: number
  byggeaar?: number
}

interface GeonorgeAdresseSvar {
  adresser: GeonorgeAdressetreff[]
  totaltAntallTreff: number
}

export async function slaOppEiendom(adresse: string): Promise<MatrikkelEiendom | null> {
  try {
    const url = new URL(`${ADRESSE_API}/sok`)
    url.searchParams.set('sok', adresse)
    url.searchParams.set('utkoordsys', '4258') // WGS84
    url.searchParams.set('treffPerSide', '1')
    url.searchParams.set('sokemodus', 'AND')

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }, // Cache i 24 timer
    })

    if (!response.ok) {
      console.error('Matrikkelen API feil:', response.status)
      return null
    }

    const data: GeonorgeAdresseSvar = await response.json()

    if (!data.adresser || data.adresser.length === 0) {
      return null
    }

    const treff = data.adresser[0]

    return {
      adresse: treff.adressetekst,
      postnummer: treff.postnummer,
      poststed: treff.poststed,
      gnr: treff.gardsnummer,
      bnr: treff.bruksnummer,
      bra: treff.bruksareal ?? null,
      byggeaar: treff.byggeaar ?? null,
      boligtype: 'ukjent', // Matrikkelen returnerer dette, men krever eget kall
      koordinater: treff.representasjonspunkt
        ? { lat: treff.representasjonspunkt.lat, lng: treff.representasjonspunkt.lon }
        : null,
    }
  } catch (error) {
    console.error('Feil ved oppslag i Matrikkelen:', error)
    return null
  }
}

// Hent bygningsdetaljer (boligtype, areal) fra Matrikkelen bygnings-API
export async function hentBygningsdata(gnr: number, bnr: number, kommunenummer: string) {
  try {
    const url = `https://ws.geonorge.no/adresser/v1/adresser?gardsnummer=${gnr}&bruksnummer=${bnr}&kommunenummer=${kommunenummer}`
    const response = await fetch(url, {
      next: { revalidate: 86400 },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
