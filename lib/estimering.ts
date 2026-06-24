import {
  Estimat,
  Justeringsfaktor,
  SammenlignbartSalg,
  FinnAnnonse,
  MatrikkelEiendom,
} from '@/types'
import {
  scoreOgFilter,
  fjernPrisOutliers,
  veietMedian,
  toppN,
  TOPP_N,
} from '@/lib/comp-utvalg'

interface EstimeringInput {
  finnAnnonse: FinnAnnonse | null
  eiendom: MatrikkelEiendom
  comps: SammenlignbartSalg[]
  berikelser?: Justeringsfaktor[]
}

export function beregnEstimat(input: EstimeringInput): Estimat {
  const { finnAnnonse, eiendom, comps, berikelser = [] } = input

  // Bruk BRA fra annonse hvis tilgjengelig, ellers fra Matrikkelen
  const bra = finnAnnonse?.bra ?? eiendom.bra ?? 0

  if (bra === 0) {
    throw new Error('Mangler arealdata — kan ikke beregne estimat')
  }

  // --- TRINN 1: Score, filtrer og rangér comps etter produktprioritering ---
  // 1) Nærområdet (45 %)  2) Boligtype+BRA (40 %)  3) Ferskhet (15 %)
  // Pris/kvm brukes ikke i scoring, men vi trimmer IQR-outliers før median.
  const scoreteComps = scoreOgFilter(
    {
      bra,
      boligtype: eiendom.boligtype,
      koordinater: eiendom.koordinater,
    },
    comps
  )

  if (scoreteComps.length === 0) {
    throw new Error(
      'Fant ingen relevante sammenlignbare salg innenfor 2 km og ±30 % BRA siste 24 mnd.'
    )
  }

  const toppRangerte = toppN(scoreteComps, TOPP_N)
  const utenOutliers = fjernPrisOutliers(toppRangerte)
  const relevanteComps = utenOutliers
  const basisPrisPerKvm = veietMedian(relevanteComps)

  // --- TRINN 2: Samle justeringsfaktorer ---
  const etasje = finnAnnonse?.etasje ?? null
  const balkong = finnAnnonse?.balkong ?? false
  const solforhold = finnAnnonse?.solforhold ?? 'ukjent'
  const oppussingsaar = finnAnnonse?.oppussingsaar ?? null
  const byggeaar = eiendom.byggeaar ?? null

  const justeringer: Justeringsfaktor[] = []

  // Etasje
  if (etasje !== null) {
    let etasjeJustering = 0
    let etasjeBeskrivelse = ''
    if (etasje === 1) {
      etasjeJustering = -3
      etasjeBeskrivelse = '1. etasje'
    } else if (etasje >= 2 && etasje <= 3) {
      etasjeJustering = 0
      etasjeBeskrivelse = '2.–3. etasje (nøytral)'
    } else if (etasje >= 4) {
      etasjeJustering = 3
      etasjeBeskrivelse = `${etasje}. etasje`
    }
    justeringer.push({
      navn: 'Etasje',
      beskrivelse: etasjeBeskrivelse,
      justeringsProsent: etasjeJustering,
      brukt: true,
      kategori: 'bolig',
    })
  }

  // Balkong
  justeringer.push({
    navn: 'Balkong/terrasse',
    beskrivelse: balkong ? 'Har balkong eller terrasse' : 'Ingen balkong eller terrasse',
    justeringsProsent: balkong ? 3 : 0,
    brukt: balkong,
    kategori: 'bolig',
  })

  // Solforhold
  const solJusteringMap: Record<string, number> = {
    god: 2,
    middels: 0,
    liten: -2,
    ukjent: 0,
  }
  if (solforhold !== 'ukjent') {
    justeringer.push({
      navn: 'Solforhold',
      beskrivelse: `${solforhold.charAt(0).toUpperCase() + solforhold.slice(1)} solforhold`,
      justeringsProsent: solJusteringMap[solforhold],
      brukt: solJusteringMap[solforhold] !== 0,
      kategori: 'bolig',
    })
  }

  // Nylig oppusset
  if (oppussingsaar) {
    const alder = new Date().getFullYear() - oppussingsaar
    if (alder <= 5) {
      justeringer.push({
        navn: 'Nylig oppusset',
        beskrivelse: `Oppusset ${oppussingsaar} (${alder} år siden)`,
        justeringsProsent: 5,
        brukt: true,
        kategori: 'bolig',
      })
    }
  }

  // Tomteareal (hage/uteområde) — differensiert etter avstand fra Oslo sentrum.
  // <3 km ≈ innenfor Ring 2, 3–5 km ≈ Ring 2–3, >5 km ≈ ytterkant.
  const tomteareal = finnAnnonse?.tomteareal ?? null
  const tomteEiet = finnAnnonse?.tomteEiet ?? false
  if (tomteareal && tomteareal >= 100 && eiendom.koordinater) {
    const avstandKm = avstandFraOsloSentrumKm(eiendom.koordinater)
    const sone: 'ring2' | 'ring3' | 'ytre' =
      avstandKm < 3 ? 'ring2' : avstandKm < 5 ? 'ring3' : 'ytre'

    let prosent = 0
    if (tomteareal < 300) prosent = sone === 'ring2' ? 4 : 2
    else if (tomteareal < 600) prosent = sone === 'ring2' ? 8 : sone === 'ring3' ? 6 : 4
    else prosent = sone === 'ring2' ? 10 : sone === 'ring3' ? 8 : 6

    // Felles/festet tomt gir mye svakere signal — maks +2 %
    if (!tomteEiet) prosent = Math.min(prosent, 2)

    if (prosent > 0) {
      const soneLabel =
        sone === 'ring2'
          ? 'innenfor Ring 2'
          : sone === 'ring3'
            ? 'Ring 2–3'
            : 'ytre Oslo'
      justeringer.push({
        navn: 'Tomteareal',
        beskrivelse: `${tomteareal} m² ${tomteEiet ? 'eiet' : 'felles/festet'} tomt, ${soneLabel}`,
        justeringsProsent: prosent,
        brukt: true,
        kategori: 'bolig',
      })
    }
  }

  // Byggeår (eldre bygg — moderat negativ)
  if (byggeaar && byggeaar < 1980) {
    const justeringAlder = byggeaar < 1950 ? -4 : -2
    justeringer.push({
      navn: 'Byggeår',
      beskrivelse: `Bygget ${byggeaar}`,
      justeringsProsent: justeringAlder,
      brukt: true,
      kategori: 'bolig',
    })
  }

  // Berikelser fra åpne datakilder (transport, miljø, skole)
  justeringer.push(...berikelser)

  // --- TRINN 3: Beregn samlet justeringsfaktor ---
  const totalJusteringProsent = justeringer.reduce(
    (sum, j) => sum + j.justeringsProsent,
    0
  )
  const justeringMultiplikator = 1 + totalJusteringProsent / 100

  // --- TRINN 4: Beregn estimert verdi ---
  let estimertVerdi = Math.round(basisPrisPerKvm * bra * justeringMultiplikator)

  // Trekk fra fellesgjeld (kjøper overtar gjelden)
  const fellesgjeld = finnAnnonse?.fellesgjeld ?? 0
  if (fellesgjeld > 0) {
    justeringer.push({
      navn: 'Fellesgjeld',
      beskrivelse: `Fellesgjeld på ${formaterPris(fellesgjeld)} trekkes fra totalverdi`,
      justeringsProsent: 0, // Absolutt trekk, ikke prosent
      brukt: true,
      kategori: 'bolig',
    })
    estimertVerdi -= fellesgjeld
  }

  // Avrund til nærmeste 10 000
  estimertVerdi = Math.round(estimertVerdi / 10000) * 10000

  // --- TRINN 5: Konfidensindikator ---
  // Kombinerer antall comps og deres gjennomsnittlige relevans-score.
  // Mange og høyt scorede comps → sterk. Få eller lavt scorede → svak.
  const antallComps = relevanteComps.length
  const snittScore =
    relevanteComps.reduce((s, c) => s + (c.score ?? 0), 0) /
    Math.max(1, antallComps)
  const konfidens: Estimat['konfidens'] =
    antallComps >= 8 && snittScore >= 0.7
      ? 'sterk'
      : antallComps >= 5 && snittScore >= 0.5
        ? 'middels'
        : 'svak'

  return {
    estimertVerdi,
    nedreGrense: Math.round((estimertVerdi * 0.92) / 10000) * 10000,
    ovreGrense: Math.round((estimertVerdi * 1.08) / 10000) * 10000,
    basisPrisPerKvm: Math.round(basisPrisPerKvm),
    antallComps,
    konfidens,
    justeringsfaktorer: justeringer,
    comps: relevanteComps,
  }
}

// Oslo sentrum (Stortinget/Karl Johan)
const OSLO_SENTRUM = { lat: 59.9139, lng: 10.7522 }

function avstandFraOsloSentrumKm(k: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(k.lat - OSLO_SENTRUM.lat)
  const dLng = toRad(k.lng - OSLO_SENTRUM.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(OSLO_SENTRUM.lat)) * Math.cos(toRad(k.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formaterPris(pris: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(pris)
}
