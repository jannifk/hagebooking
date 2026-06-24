import { SammenlignbartSalg } from '@/types'

/**
 * Comp-utvalg: plukker de mest sammenlignbare salgene for en subject-bolig.
 *
 * Prioritering (etter produktkrav):
 *   1. Nærområdet        — 45 %
 *   2. Samme boligtype   — 20 %  (harddt filter hvis begge er kjent)
 *   3. Lignende BRA      — 20 %
 *   4. Ferskhet på salget — 15 %
 *
 * Pris/kvm brukes IKKE som scoring-faktor (det er jo det vi skal estimere),
 * men vi trimmer IQR-outliers før veiet median, slik at et enkelt rart salg
 * ikke drar basisprisen av gårde.
 */

export interface SubjectEiendom {
  bra: number
  boligtype?: string | null
  koordinater?: { lat: number; lng: number } | null
}

// Avstands-terskler (meter)
export const IDEELL_RADIUS_M = 500
export const AKSEPTABEL_RADIUS_M = 1500
export const MAKS_RADIUS_M = 2000

// BRA-terskel (relativt avvik)
export const MAKS_BRA_AVVIK = 0.30

// Tidsvindu (måneder)
export const MAKS_MNDER_TILBAKE = 24

// Maks antall comps til selve estimeringen
export const TOPP_N = 12

// Scoringsvekter — summerer til 1.0
const VEKT = {
  avstand: 0.45,
  boligtype: 0.20,
  areal: 0.20,
  ferskhet: 0.15,
} as const

/**
 * Scorer og filtrerer alle kandidat-comps mot subject-boligen.
 * Returnerer sortert liste (høyest score først).
 */
export function scoreOgFilter(
  subject: SubjectEiendom,
  kandidater: SammenlignbartSalg[]
): SammenlignbartSalg[] {
  const no = Date.now()
  const resultat: SammenlignbartSalg[] = []

  for (const c of kandidater) {
    // Hard 1: BRA innenfor ±30 %
    if (subject.bra <= 0) continue
    const braAvvik = Math.abs(c.bra - subject.bra) / subject.bra
    if (braAvvik > MAKS_BRA_AVVIK) continue

    // Hard 2: maks MAKS_MNDER_TILBAKE gammelt salg
    const mnderSiden =
      (no - new Date(c.salgsdato).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (mnderSiden > MAKS_MNDER_TILBAKE || mnderSiden < 0) continue

    // Hard 3: pris/kvm > 0
    if (c.prisPerKvm <= 0 || !Number.isFinite(c.prisPerKvm)) continue

    // Hard 4: samme boligtype hvis begge er kjent (og ikke 'ukjent')
    const sType = subject.boligtype && subject.boligtype !== 'ukjent' ? subject.boligtype : null
    const cType = c.boligtype && c.boligtype !== 'ukjent' ? c.boligtype : null
    if (sType && cType && sType !== cType) continue

    // Hard 5: avstand (hvis vi har koordinater begge veier)
    const avstandMeter = beregnAvstandMeter(subject.koordinater, c.koordinater)
    if (avstandMeter !== null && avstandMeter > MAKS_RADIUS_M) continue

    // Komponent-scores
    const avstandScore = avstandKomponent(avstandMeter)
    const boligtypeScore = boligtypeKomponent(sType, cType)
    const arealScore = arealKomponent(braAvvik)
    const ferskhetScore = ferskhetKomponent(mnderSiden)

    const score =
      VEKT.avstand * avstandScore +
      VEKT.boligtype * boligtypeScore +
      VEKT.areal * arealScore +
      VEKT.ferskhet * ferskhetScore

    resultat.push({
      ...c,
      avstandMeter,
      score: Math.round(score * 1000) / 1000,
      scoreKomponenter: {
        avstand: round3(avstandScore),
        boligtype: round3(boligtypeScore),
        areal: round3(arealScore),
        ferskhet: round3(ferskhetScore),
      },
    })
  }

  return resultat.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

/**
 * Fjerner pris/kvm-outliers med IQR 1.5× — brukes etter at vi har et topp-N.
 * Beholder alltid minst 3 comps hvis vi har dem, selv om det strengt tatt
 * er outliers.
 */
export function fjernPrisOutliers(
  comps: SammenlignbartSalg[]
): SammenlignbartSalg[] {
  if (comps.length < 4) return comps
  const priser = comps.map((c) => c.prisPerKvm).sort((a, b) => a - b)
  const q1 = priser[Math.floor(priser.length * 0.25)]
  const q3 = priser[Math.floor(priser.length * 0.75)]
  const iqr = q3 - q1
  const nedre = q1 - iqr * 1.5
  const ovre = q3 + iqr * 1.5
  const uteGrensed = comps.filter((c) => c.prisPerKvm >= nedre && c.prisPerKvm <= ovre)
  // Ikke fjern så mange at vi står igjen med for lite data
  return uteGrensed.length >= 3 ? uteGrensed : comps
}

/**
 * Vektet median der hver comp-pris teller sin `score` ganger.
 * Gir samme resultat som vanlig median hvis alle scorer likt.
 */
export function veietMedian(
  comps: Array<{ prisPerKvm: number; score?: number }>
): number {
  if (comps.length === 0) return 0
  if (comps.length === 1) return comps[0].prisPerKvm

  const sortert = [...comps].sort((a, b) => a.prisPerKvm - b.prisPerKvm)
  const totalVekt = sortert.reduce((s, c) => s + (c.score ?? 1), 0)
  if (totalVekt === 0) {
    // Faller tilbake til vanlig median
    const midt = Math.floor(sortert.length / 2)
    return sortert.length % 2 !== 0
      ? sortert[midt].prisPerKvm
      : Math.round((sortert[midt - 1].prisPerKvm + sortert[midt].prisPerKvm) / 2)
  }

  let kumulativ = 0
  for (const c of sortert) {
    kumulativ += c.score ?? 1
    if (kumulativ >= totalVekt / 2) return c.prisPerKvm
  }
  return sortert[sortert.length - 1].prisPerKvm
}

/** Tar topp-N fra en scoret og sortert liste */
export function toppN(
  comps: SammenlignbartSalg[],
  n: number = TOPP_N
): SammenlignbartSalg[] {
  return comps.slice(0, n)
}

// ------------ Komponent-scoring helpers ------------

function avstandKomponent(meter: number | null): number {
  if (meter === null) return 0.5 // nøytralt når vi ikke har koordinater
  if (meter <= IDEELL_RADIUS_M) return 1
  if (meter <= AKSEPTABEL_RADIUS_M) {
    // lineær fra 1.0 @ 500m til 0.3 @ 1500m
    const frac = (meter - IDEELL_RADIUS_M) / (AKSEPTABEL_RADIUS_M - IDEELL_RADIUS_M)
    return 1 - frac * 0.7
  }
  // 1500m–2000m: 0.3 til 0
  const frac = (meter - AKSEPTABEL_RADIUS_M) / (MAKS_RADIUS_M - AKSEPTABEL_RADIUS_M)
  return Math.max(0, 0.3 * (1 - frac))
}

function boligtypeKomponent(subjectType: string | null, compType: string | null): number {
  if (!subjectType || !compType) return 0.6 // delvis kreditt når type er ukjent
  return subjectType === compType ? 1 : 0 // ulike typer ville allerede blitt hard-filtrert
}

function arealKomponent(braAvvik: number): number {
  // 0 % avvik → 1.0, 30 % → 0, lineært
  return Math.max(0, 1 - braAvvik / MAKS_BRA_AVVIK)
}

function ferskhetKomponent(mnderSiden: number): number {
  // 0 mnd → 1.0, 24 mnd → 0.3
  const clamped = Math.max(0, Math.min(MAKS_MNDER_TILBAKE, mnderSiden))
  return 1 - (clamped / MAKS_MNDER_TILBAKE) * 0.7
}

export function beregnAvstandMeter(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): number | null {
  if (!a || !b) return null
  const R = 6371000 // jordens radius i meter
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
