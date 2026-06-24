// Smoketest for comp-utvalg-modulen: kjør med `npx tsx scripts/test-comp-utvalg.ts`
// Dette er ikke en unit-test, men en synlig verifikasjon av at scoringen
// rangerer nært/riktig-type/lignende BRA over fjernt/feil-type/stort avvik.

import { hentSammenlignbareSalg } from '../lib/kartverket'
import { scoreOgFilter, fjernPrisOutliers, veietMedian, toppN } from '../lib/comp-utvalg'

async function main() {
  // Subject: 74 m² leilighet på Grünerløkka
  const subject = {
    bra: 74,
    boligtype: 'leilighet' as const,
    koordinater: { lat: 59.9267, lng: 10.7603 },
  }

  // Hent "rå" comps fra mock-kilden
  process.env.USE_MOCK_DATA = 'true'
  const raaComps = await hentSammenlignbareSalg({
    postnummer: '0555',
    bra: subject.bra,
    boligtype: subject.boligtype,
    subjectKoordinater: subject.koordinater,
  })

  console.log(`\n== Rå comps fra mock: ${raaComps.length} ==`)
  for (const c of raaComps) {
    console.log(
      `  ${c.adresse.padEnd(36)} ${c.boligtype?.padEnd(10)} bra=${String(c.bra).padStart(3)} kr/m²=${c.prisPerKvm.toLocaleString('nb-NO').padStart(8)}`
    )
  }

  // Skoor og filtrer
  const scoret = scoreOgFilter(subject, raaComps)
  console.log(`\n== Etter scoreOgFilter: ${scoret.length} (ranget) ==`)
  for (const c of scoret) {
    const sk = c.scoreKomponenter!
    console.log(
      `  ${(c.score ?? 0).toFixed(3)} ${c.adresse.padEnd(36)} ` +
        `avst=${String(c.avstandMeter).padStart(5)}m type=${sk.boligtype.toFixed(2)} ` +
        `areal=${sk.areal.toFixed(2)} ferskhet=${sk.ferskhet.toFixed(2)}`
    )
  }

  // Topp-N, outlier-trim, veiet median
  const topp = toppN(scoret)
  const trimmet = fjernPrisOutliers(topp)
  const basisPrisPerKvm = Math.round(veietMedian(trimmet))

  console.log(`\n== Topp ${topp.length} → etter outlier-trim ${trimmet.length} ==`)
  for (const c of trimmet) {
    console.log(
      `  ${(c.score ?? 0).toFixed(3)}  ${c.adresse.padEnd(36)} ${c.prisPerKvm.toLocaleString('nb-NO').padStart(8)} kr/m²`
    )
  }
  console.log(`\n== Veiet median kr/m²: ${basisPrisPerKvm.toLocaleString('nb-NO')} ==`)
  console.log(`== Estimert markedsverdi (basis × BRA): ${(basisPrisPerKvm * subject.bra).toLocaleString('nb-NO')} kr ==`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
