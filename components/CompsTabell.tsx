import { SammenlignbartSalg } from '@/types'
import { formaterPris } from '@/lib/estimering'

interface Props {
  comps: SammenlignbartSalg[]
  eiendomKoordinater?: { lat: number; lng: number } | null
  poststed?: string
}

function formaterAvstand(meter: number | null | undefined): string {
  if (meter == null) return '—'
  if (meter < 1000) return `${meter} m`
  return `${(meter / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} km`
}

export default function CompsTabell({
  comps,
  eiendomKoordinater,
  poststed,
}: Props) {
  if (comps.length === 0) return null

  // Comps kommer allerede sortert etter relevans-score fra estimeringen;
  // rekkefølgen i tabellen speiler hvilke salg som dro estimatet mest.
  const rangerte = comps

  // Beregn prosentandel posisjon i kartet for hver comp
  const subject = eiendomKoordinater ?? comps[0].koordinater
  const compsMedPos = rangerte.map((c, i) => {
    if (!c.koordinater || !subject) return { c, i, x: null, y: null }
    const dx = c.koordinater.lng - subject.lng
    const dy = c.koordinater.lat - subject.lat
    const x = 50 + dx * 1400
    const y = 50 - dy * 3200
    return {
      c,
      i,
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(10, Math.min(88, y)),
    }
  })

  const kartRef = subject
    ? `${poststed?.toUpperCase() ?? 'OSLO'} · ${subject.lat.toFixed(3)}°N, ${subject.lng.toFixed(3)}°Ø`
    : 'OSLO'

  // Hint-teksten speiler faktisk spredning i utvalget
  const avstander = rangerte
    .map((c) => c.avstandMeter)
    .filter((d): d is number => typeof d === 'number')
  const maksAvstand = avstander.length ? Math.max(...avstander) : null
  const avstandHint = maksAvstand
    ? maksAvstand < 1000
      ? `innenfor ${Math.round(maksAvstand / 50) * 50} m`
      : `innenfor ${(maksAvstand / 1000).toFixed(1)} km`
    : 'i nærområdet'

  return (
    <div className="panel comps">
      <div className="panel-head">
        <h2>Sammenlignbare salg · {comps.length}</h2>
        <span className="hint">
          {avstandHint} · samme boligtype · ±30 % BRA · siste 24 mnd
        </span>
      </div>

      <div className="comps-map" aria-hidden>
        <div className="mock-map" />
        <div className="mock-map-grid" />
        {subject && (
          <div
            className="map-pin subject"
            style={{ left: '50%', top: '50%' }}
            title="Boligen"
          >
            •
          </div>
        )}
        {compsMedPos.map(({ c, i, x, y }) =>
          x === null || y === null ? null : (
            <div
              key={i}
              className="map-pin"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${c.adresse} · ${formaterAvstand(c.avstandMeter)}`}
            >
              {i + 1}
            </div>
          )
        )}
        <div className="mock-map-caption">{kartRef}</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="comps-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Adresse</th>
              <th className="right">Avstand</th>
              <th className="right">Solgt</th>
              <th className="right">BRA</th>
              <th className="right">Kr/m²</th>
              <th className="right">Salgspris</th>
            </tr>
          </thead>
          <tbody>
            {rangerte.map((c, i) => {
              const relevans = c.score ?? null
              const relevansCls =
                relevans === null
                  ? ''
                  : relevans >= 0.75
                    ? 'rel-hoy'
                    : relevans >= 0.55
                      ? 'rel-med'
                      : 'rel-lav'
              return (
                <tr key={i} className={relevansCls}>
                  <td className="num-cell">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="addr">{c.adresse}</td>
                  <td className="right num-cell">
                    {formaterAvstand(c.avstandMeter)}
                  </td>
                  <td className="right num-cell">
                    {new Date(c.salgsdato).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="right num-cell">{c.bra} m²</td>
                  <td className="right num-cell">
                    {c.prisPerKvm.toLocaleString('nb-NO')}
                  </td>
                  <td className="right pris">
                    {formaterPris(c.salgspris)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
