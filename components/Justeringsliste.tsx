import { Justeringsfaktor, Justeringskategori } from '@/types'

interface Props {
  faktorer: Justeringsfaktor[]
}

const KATEGORI_LABEL: Record<Justeringskategori, string> = {
  bolig: 'Boligegenskaper',
  transport: 'Transport',
  miljo: 'Miljø & nabolag',
  skole: 'Skole',
}

const KATEGORI_REKKEFOLGE: Justeringskategori[] = [
  'bolig',
  'transport',
  'skole',
  'miljo',
]

// Maks absoluttverdi for å normalisere bar-lengden visuelt
const MAX_BAR_PROSENT = 6

export default function Justeringsliste({ faktorer }: Props) {
  const brukteFaktorer = faktorer.filter((f) => f.brukt)
  if (brukteFaktorer.length === 0) return null

  const totalJustering = brukteFaktorer.reduce(
    (sum, f) => sum + f.justeringsProsent,
    0
  )

  const grupper = KATEGORI_REKKEFOLGE.map((kategori) => ({
    kategori,
    faktorer: brukteFaktorer.filter(
      (f) => (f.kategori ?? 'bolig') === kategori
    ),
  })).filter((g) => g.faktorer.length > 0)

  const antallKategorier = grupper.length

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Justeringsfaktorer</h2>
        <span className="hint">
          {brukteFaktorer.length} faktorer · {antallKategorier} kategorier
        </span>
      </div>

      <div className="adjust-grid">
        {grupper.map(({ kategori, faktorer }) => {
          const kategoriSum = faktorer.reduce(
            (s, f) => s + f.justeringsProsent,
            0
          )
          const sumCls =
            kategoriSum > 0 ? 'pos' : kategoriSum < 0 ? 'neg' : ''
          return (
            <div key={kategori} className="adjust-group">
              <div className="adjust-group-label">
                <span>{KATEGORI_LABEL[kategori]}</span>
                <span className={`total ${sumCls}`}>
                  {kategoriSum > 0 ? '+' : ''}
                  {kategoriSum}%
                </span>
              </div>
              {faktorer.map((faktor) => {
                const pct = faktor.justeringsProsent
                const pctCls = pct > 0 ? 'pos' : pct < 0 ? 'neg' : 'zero'
                const barWidth = Math.min(
                  50,
                  (Math.abs(pct) / MAX_BAR_PROSENT) * 50
                )
                const barLeft =
                  pct >= 0 ? '50%' : `calc(50% - ${barWidth}%)`
                return (
                  <div key={faktor.navn} className="adjust-row">
                    <div>
                      <div className="adjust-name">{faktor.navn}</div>
                      <div className="adjust-desc">{faktor.beskrivelse}</div>
                      {faktor.kilde && (
                        <span className="adjust-src">
                          Kilde · {faktor.kilde}
                        </span>
                      )}
                    </div>
                    <div className="adjust-bar" aria-hidden>
                      <div
                        className={`adjust-bar-fill ${pct < 0 ? 'neg' : ''}`}
                        style={{
                          width: `${barWidth}%`,
                          left: barLeft,
                        }}
                      />
                    </div>
                    <div className={`adjust-pct ${pctCls}`}>
                      {pct > 0 ? '+' : ''}
                      {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="adjust-total-row">
        <span className="label">Netto justering over basis</span>
        <span
          className={`val ${
            totalJustering > 0
              ? 'pos'
              : totalJustering < 0
                ? 'neg'
                : ''
          }`}
        >
          {totalJustering > 0 ? '+' : ''}
          {totalJustering}%
        </span>
      </div>
    </div>
  )
}
