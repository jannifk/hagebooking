export default function Metodikk() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Slik beregner vi estimatet</h1>
      <p className="text-[var(--muted)] mb-10">
        Vi tror på transparens. Her er nøyaktig hvordan Boligverdi regner.
      </p>

      <div className="space-y-10">
        <Seksjon
          steg="1"
          tittel="Vi finner sammenlignbare salg"
          tekst="Vi henter faktiske salgspriser fra Kartverkets tinglysningsregister — ikke prisantydninger, men hva boliger faktisk ble solgt for. Vi filtrerer på samme postnummer, samme boligtype og boliger med ±20% av det samme arealet, solgt de siste 24 månedene."
        />
        <Seksjon
          steg="2"
          tittel="Vi beregner en basispris per kvadratmeter"
          tekst="Fra de sammenlignbare salgene beregner vi medianverdien av pris per kvadratmeter. Vi bruker median (ikke gjennomsnitt) fordi det er mer robust mot ekstremverdier — en enkelt særlig billig eller dyr bolig vil ikke velte estimatet."
        />
        <Seksjon
          steg="3"
          tittel="Vi justerer for boligens egenskaper"
          tekst="Basisprisen justeres opp eller ned basert på faktorer som ikke fanges opp av areal alene. Disse justeringene er i dag basert på bransjeerfaring og vil over tid kalibreres mot faktiske salgspriser."
        />

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-soft)] mb-4">Justeringsfaktorer</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['1. etasje', '−3%'],
              ['4. etasje eller høyere', '+3%'],
              ['Balkong eller terrasse', '+3%'],
              ['God solforhold', '+2%'],
              ['Liten solforhold', '−2%'],
              ['Nylig oppusset (< 5 år)', '+5%'],
              ['Eldre bygg (< 1950)', '−4%'],
              ['Eldre bygg (1950–1980)', '−2%'],
              ['Fellesgjeld', 'Trekkes fra totalsum'],
            ].map(([faktor, verdi]) => (
              <div key={faktor} className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">{faktor}</span>
                <span className="font-medium text-[var(--text)]">{verdi}</span>
              </div>
            ))}
          </div>
        </div>

        <Seksjon
          steg="4"
          tittel="Konfidensintervall og usikkerhet"
          tekst="Vi viser estimatet som et intervall på ±8%. Vi angir også konfidens basert på antall sammenlignbare salg: under 5 salg = svak, 5–15 = middels, over 15 = god. En bolig i et område med lite omsetning vil ha større usikkerhet enn en leilighet i et populært område."
        />

        <div className="bg-[color-mix(in_oklch,var(--negative)_12%,var(--bg))] border border-[color-mix(in_oklch,var(--negative)_45%,transparent)] rounded-2xl p-5 text-sm text-[var(--negative)]">
          <strong className="block mb-1">Viktig forbehold</strong>
          Boligverdi er ikke en meglertjeneste og estimatene er ikke juridisk bindende. Modellen er under utvikling og vil forbedres over tid. Vi er i MVP-fase, og kun Oslo-området støttes foreløpig.
        </div>
      </div>
    </div>
  )
}

function Seksjon({ steg, tittel, tekst }: { steg: string; tittel: string; tekst: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-sm font-bold flex items-center justify-center">
        {steg}
      </div>
      <div>
        <h2 className="font-semibold text-[var(--text)] mb-1">{tittel}</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed">{tekst}</p>
      </div>
    </div>
  )
}
