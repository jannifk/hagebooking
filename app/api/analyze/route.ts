import { NextRequest, NextResponse } from 'next/server'
import { scrapeFinnAnnonse } from '@/lib/finn-scraper'
import { slaOppEiendom } from '@/lib/matrikkelen'
import { hentSammenlignbareSalg } from '@/lib/kartverket'
import { beregnEstimat } from '@/lib/estimering'
import { hentAlleBerikelser } from '@/lib/berikelse'
import { AnalyseResultat, MatrikkelEiendom } from '@/types'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { finnUrl, adresse } = body

    if (!finnUrl && !adresse) {
      return NextResponse.json(
        { error: 'Oppgi enten en Finn-URL eller en adresse' },
        { status: 400 }
      )
    }

    // --- Steg 1: Hent Finn-annonsedata ---
    let finnAnnonse = null
    let adresseForOppslag = adresse

    if (finnUrl) {
      try {
        finnAnnonse = await scrapeFinnAnnonse(finnUrl)
        adresseForOppslag = finnAnnonse.adresse
      } catch (err) {
        return NextResponse.json(
          {
            error: 'Klarte ikke hente Finn-annonsen.',
            detaljer: err instanceof Error ? err.message : 'Ukjent feil',
            fallback: 'Prøv å fylle inn adresse manuelt i stedet.',
          },
          { status: 422 }
        )
      }
    }

    if (!adresseForOppslag) {
      return NextResponse.json(
        { error: 'Mangler adresse — fikk ikke tak i adresse fra Finn-annonsen' },
        { status: 400 }
      )
    }

    // --- Steg 2: Slå opp eiendom i Matrikkelen ---
    let eiendom = await slaOppEiendom(adresseForOppslag)

    if (!eiendom) {
      // Lag en minimal eiendomspost hvis Matrikkelen ikke svarer
      eiendom = lagMinimalEiendom(adresseForOppslag, finnAnnonse)
    } else {
      // Fyll inn hull fra Finn-data der Matrikkelen mangler
      if (finnAnnonse?.bra && !eiendom.bra) {
        eiendom.bra = finnAnnonse.bra
      }
    }

    // Trenger postnummer for comps-søk
    const postnummer = eiendom.postnummer || trekkUtPostnummer(adresseForOppslag)
    if (!postnummer) {
      return NextResponse.json(
        { error: 'Klarte ikke identifisere postnummer. Inkluder postnummer i adressen.' },
        { status: 422 }
      )
    }
    eiendom.postnummer = postnummer

    // Trenger BRA for å beregne estimat
    const bra = finnAnnonse?.bra ?? eiendom.bra
    if (!bra || bra === 0) {
      return NextResponse.json(
        {
          error: 'Mangler arealdata (BRA/P-ROM).',
          detaljer: 'Fant ikke bruksareal i annonsen eller Matrikkelen.',
        },
        { status: 422 }
      )
    }

    // --- Steg 3: Hent comps og berikelser parallelt ---
    const [comps, berikelser] = await Promise.all([
      hentSammenlignbareSalg({
        postnummer,
        bra,
        boligtype: eiendom.boligtype,
        subjectKoordinater: eiendom.koordinater,
      }),
      hentAlleBerikelser(eiendom.koordinater),
    ])

    // --- Steg 4: Beregn estimat ---
    let estimat
    try {
      estimat = beregnEstimat({ finnAnnonse, eiendom, comps, berikelser })
    } catch (err) {
      return NextResponse.json(
        {
          error: 'Kunne ikke beregne estimat.',
          detaljer: err instanceof Error ? err.message : 'Ukjent feil',
        },
        { status: 422 }
      )
    }

    const resultat: AnalyseResultat = {
      id: randomUUID(),
      opprettet: new Date().toISOString(),
      finnAnnonse,
      eiendom,
      estimat,
    }

    return NextResponse.json(resultat)
  } catch (error) {
    console.error('Uventet feil i /api/analyze:', error)
    return NextResponse.json(
      { error: 'En uventet feil oppstod. Prøv igjen.' },
      { status: 500 }
    )
  }
}

function lagMinimalEiendom(adresse: string, finnAnnonse: unknown): MatrikkelEiendom {
  const finn = finnAnnonse as { bra?: number } | null
  return {
    adresse,
    postnummer: trekkUtPostnummer(adresse) ?? '',
    poststed: '',
    gnr: 0,
    bnr: 0,
    bra: finn?.bra ?? null,
    byggeaar: null,
    boligtype: 'leilighet',
    koordinater: null,
  }
}

function trekkUtPostnummer(tekst: string): string | null {
  const match = tekst.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}
