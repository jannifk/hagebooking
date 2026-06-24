// Bygger en komplett AnalyseResultat fra mock-flyten og skriver den til stdout som JSON.
// Brukes for å stappe resultatet inn i sessionStorage i nettleseren og verifisere UI
// uten å være avhengig av ekte Matrikkelen/Kartverket-kall.

import { hentSammenlignbareSalg } from '../lib/kartverket'
import { beregnEstimat } from '../lib/estimering'
import { AnalyseResultat, MatrikkelEiendom, FinnAnnonse } from '../types'
import { randomUUID } from 'crypto'

async function main() {
  process.env.USE_MOCK_DATA = 'true'

  const eiendom: MatrikkelEiendom = {
    adresse: 'Thorvald Meyers gate 38, 0555 Oslo',
    postnummer: '0555',
    poststed: 'Oslo',
    gnr: 228,
    bnr: 145,
    bra: 74,
    byggeaar: 1935,
    boligtype: 'leilighet',
    koordinater: { lat: 59.9267, lng: 10.7603 },
  }

  const finnAnnonse: FinnAnnonse = {
    finnkode: 'demo-38',
    adresse: eiendom.adresse,
    prisantydning: 7_450_000,
    bra: 74,
    etasje: 3,
    byggeaar: 1935,
    balkong: true,
    solforhold: 'god',
    oppussingsaar: 2022,
    tomteareal: null,
    tomteEiet: null,
    fellesgjeld: 0,
    boligtype: 'leilighet',
    bilder: [],
    beskrivelse: 'Lys 3-roms på Grünerløkka med balkong mot gårdsrom.',
  }

  const comps = await hentSammenlignbareSalg({
    postnummer: eiendom.postnummer,
    bra: eiendom.bra!,
    boligtype: eiendom.boligtype,
    subjectKoordinater: eiendom.koordinater,
  })

  const estimat = beregnEstimat({ finnAnnonse, eiendom, comps, berikelser: [] })

  const resultat: AnalyseResultat = {
    id: 'demo-' + randomUUID().slice(0, 8),
    opprettet: new Date().toISOString(),
    finnAnnonse,
    eiendom,
    estimat,
  }

  process.stdout.write(JSON.stringify(resultat, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
