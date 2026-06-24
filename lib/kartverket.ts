import { SammenlignbartSalg } from '@/types'

// Kartverkets Eiendomsinformasjon API
// Merk: Historiske salgspriser er begrenset tilgjengelig via åpne API-er.
// Dette modulen implementerer:
// 1. Forsøk mot Kartverkets grunnbok-API
// 2. Fallback mot mockdata for utvikling
// 3. Stub for fremtidig Eiendomsverdi.no-integrasjon

const GRUNNBOK_API = 'https://grunnbok.kartverket.no/api'

type Boligtype = 'leilighet' | 'enebolig' | 'rekkehus' | 'ukjent'

interface GrunnbokSalg {
  matrikkelenhetId: string
  kjoepsdato: string
  kjoepssum: number
  adresse?: string
  bruksareal?: number
  boligtype?: Boligtype
  koordinater?: { lat: number; lng: number }
}

// Hent sammenlignbare salg for et område.
// Returnerer solgte boliger i samme postnummer; komp-utvalg-modulen skorer
// dem senere mot subject-boligen for å plukke de mest relevante.
export async function hentSammenlignbareSalg(params: {
  postnummer: string
  bra: number
  boligtype?: string
  subjectKoordinater?: { lat: number; lng: number } | null
}): Promise<SammenlignbartSalg[]> {
  const { postnummer, bra, subjectKoordinater } = params

  // Forsøk mot Kartverket
  try {
    const salg = await hentFraKartverket(postnummer)
    if (salg.length > 0) return salg
  } catch (error) {
    console.warn('Kartverket-kall feilet, bruker mockdata:', error)
  }

  // Fallback til mockdata i utviklingsmodus
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DATA === 'true') {
    return genererMockComps(postnummer, bra, subjectKoordinater ?? null)
  }

  return []
}

async function hentFraKartverket(postnummer: string): Promise<SammenlignbartSalg[]> {
  // TODO: Kartverket tilbyr per i dag ikke en enkel søke-API for "alle salg i postnummer X".
  // Alternativer å utforske:
  // 1. Ambita / Infoland API (krever avtale) - https://www.ambita.com/
  // 2. Eiendomsverdi.no API (krever avtale)
  // 3. Skrape seeiendom.no (juridisk gråsone)
  //
  // Foreløpig: Returnerer tom array slik at mockdata brukes i utvikling.
  // Selve filtreringen/scoringen skjer i lib/comp-utvalg.ts.

  const url = `${GRUNNBOK_API}/salg?postnummer=${postnummer}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Kartverket svarte med ${response.status}`)
  }

  const data: GrunnbokSalg[] = await response.json()

  // Selve filtreringen skjer i comp-utvalg.ts. Her konverterer vi bare.
  return data
    .filter((salg) => salg.kjoepssum > 0 && salg.bruksareal)
    .map((salg) => ({
      adresse: salg.adresse ?? `Eiendom ${salg.matrikkelenhetId}`,
      postnummer,
      salgsdato: salg.kjoepsdato,
      salgspris: salg.kjoepssum,
      bra: salg.bruksareal!,
      prisPerKvm: Math.round(salg.kjoepssum / salg.bruksareal!),
      boligtype: salg.boligtype ?? 'ukjent',
      koordinater: salg.koordinater ?? null,
    }))
}

// ---------------------------------------------------------------------------
// Mockdata for utvikling
// Genererer et variert sett (>15) rundt subject-boligen. Blander boligtyper,
// spredte avstander og noen outliers, slik at scoring-algoritmen faktisk kan
// rangere forskjellig.
// ---------------------------------------------------------------------------

interface MockKandidat {
  adresse: string
  boligtype: Boligtype
  prisPerKvmFaktor: number // relativt til basis
  braFaktor: number        // relativt til subject-BRA
  dagerSiden: number
  avstandMeter: number     // ca. avstand fra subject-koordinat
  retningGrader: number    // 0 = nord, 90 = øst
}

const MOCK_KANDIDATER: MockKandidat[] = [
  // Veldig nære leiligheter (primærkandidater)
  { adresse: 'Thorvald Meyers gate 38',   boligtype: 'leilighet', prisPerKvmFaktor: 1.02, braFaktor: 1.03, dagerSiden: 42,  avstandMeter: 80,   retningGrader: 15 },
  { adresse: 'Markveien 28 A',            boligtype: 'leilighet', prisPerKvmFaktor: 1.00, braFaktor: 0.96, dagerSiden: 60,  avstandMeter: 140,  retningGrader: 95 },
  { adresse: 'Seilduksgata 7',            boligtype: 'leilighet', prisPerKvmFaktor: 0.98, braFaktor: 1.05, dagerSiden: 75,  avstandMeter: 210,  retningGrader: 200 },
  { adresse: 'Olaf Ryes plass 4',         boligtype: 'leilighet', prisPerKvmFaktor: 1.05, braFaktor: 1.08, dagerSiden: 95,  avstandMeter: 280,  retningGrader: 130 },
  { adresse: 'Grünersgate 9',             boligtype: 'leilighet', prisPerKvmFaktor: 1.01, braFaktor: 0.99, dagerSiden: 110, avstandMeter: 340,  retningGrader: 270 },

  // Moderat avstand (fortsatt relevante)
  { adresse: 'Korsgata 12',               boligtype: 'leilighet', prisPerKvmFaktor: 0.96, braFaktor: 1.02, dagerSiden: 150, avstandMeter: 520,  retningGrader: 310 },
  { adresse: 'Sofienberggata 22',         boligtype: 'leilighet', prisPerKvmFaktor: 1.03, braFaktor: 1.04, dagerSiden: 170, avstandMeter: 640,  retningGrader: 60  },
  { adresse: 'Toftes gate 42',            boligtype: 'leilighet', prisPerKvmFaktor: 0.99, braFaktor: 0.94, dagerSiden: 210, avstandMeter: 780,  retningGrader: 220 },

  // Litt gamle, lenger borte
  { adresse: 'Helgesens gate 18',         boligtype: 'leilighet', prisPerKvmFaktor: 0.94, braFaktor: 1.10, dagerSiden: 320, avstandMeter: 950,  retningGrader: 180 },
  { adresse: 'Fossveien 14',              boligtype: 'leilighet', prisPerKvmFaktor: 0.92, braFaktor: 0.88, dagerSiden: 430, avstandMeter: 1150, retningGrader: 300 },

  // Grensetilfeller (test at scoring degraderer dem)
  { adresse: 'Sannergata 3',              boligtype: 'leilighet', prisPerKvmFaktor: 0.89, braFaktor: 1.18, dagerSiden: 520, avstandMeter: 1400, retningGrader: 45  },
  { adresse: 'Fredensborgveien 28',       boligtype: 'leilighet', prisPerKvmFaktor: 0.91, braFaktor: 0.82, dagerSiden: 610, avstandMeter: 1700, retningGrader: 250 },

  // Feil type — skal hard-filtreres for leilighet-analyse
  { adresse: 'Grefsenveien 40 (rekkehus)', boligtype: 'rekkehus',  prisPerKvmFaktor: 0.85, braFaktor: 1.04, dagerSiden: 140, avstandMeter: 620,  retningGrader: 350 },
  { adresse: 'Sognsveien 62 (enebolig)',   boligtype: 'enebolig',  prisPerKvmFaktor: 0.78, braFaktor: 1.14, dagerSiden: 200, avstandMeter: 900,  retningGrader: 10  },

  // For gammelt — skal hard-filtreres (>24 mnd)
  { adresse: 'Maridalsveien 110',         boligtype: 'leilighet', prisPerKvmFaktor: 0.95, braFaktor: 1.0,  dagerSiden: 780, avstandMeter: 400,  retningGrader: 120 },

  // BRA-outlier — skal hard-filtreres (for stort avvik)
  { adresse: 'Københavngata 4 (mikro)',   boligtype: 'leilighet', prisPerKvmFaktor: 1.15, braFaktor: 0.60, dagerSiden: 80,  avstandMeter: 300,  retningGrader: 340 },

  // Pris-outlier (passerer hardfilter, trimmes av IQR)
  { adresse: 'Bjerkelundsgata 1 (luks)',  boligtype: 'leilighet', prisPerKvmFaktor: 1.45, braFaktor: 1.05, dagerSiden: 90,  avstandMeter: 450,  retningGrader: 170 },
]

// Basispris per kvm for Oslo-postnumre (grov 2025-kurert tabell)
const POST_BASIS: Record<string, number> = {
  '0172': 96000, '0173': 93000, '0174': 91000, '0175': 89000,
  '0176': 88000, '0177': 87000, '0178': 86000, '0179': 90000,
  '0180': 92000, '0181': 94000, '0182': 95000, '0183': 91000,
  '0550': 98000, '0551': 99000, '0552': 101000, '0553': 102000,
  '0554': 103000, '0555': 104000, '0556': 103000, '0558': 101000,
}

function genererMockComps(
  postnummer: string,
  subjectBra: number,
  subjectKoordinater: { lat: number; lng: number } | null
): SammenlignbartSalg[] {
  const basisKvm = POST_BASIS[postnummer] ?? 88000
  // Hvis vi ikke fikk en subject-koordinat, fall tilbake til Grünerløkka-senter
  const senter = subjectKoordinater ?? { lat: 59.9267, lng: 10.7603 }

  return MOCK_KANDIDATER.map((k) => {
    const kompBra = Math.max(15, Math.round(subjectBra * k.braFaktor))
    const prisPerKvm = Math.round(basisKvm * k.prisPerKvmFaktor)
    const salgspris = prisPerKvm * kompBra
    const salgsdato = new Date()
    salgsdato.setDate(salgsdato.getDate() - k.dagerSiden)

    return {
      adresse: k.adresse,
      postnummer,
      salgsdato: salgsdato.toISOString().split('T')[0],
      salgspris,
      bra: kompBra,
      prisPerKvm,
      boligtype: k.boligtype,
      koordinater: forskyvKoordinat(senter, k.avstandMeter, k.retningGrader),
    }
  })
}

// Flytter et koordinat N meter i en retning (0=nord, 90=øst, 180=sør, 270=vest)
function forskyvKoordinat(
  start: { lat: number; lng: number },
  meter: number,
  retningGrader: number
): { lat: number; lng: number } {
  const R = 6371000
  const bearing = (retningGrader * Math.PI) / 180
  const dByR = meter / R
  const lat1 = (start.lat * Math.PI) / 180
  const lng1 = (start.lng * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
      Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
    )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
}
