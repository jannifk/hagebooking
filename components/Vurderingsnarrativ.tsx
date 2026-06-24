import { Justeringsfaktor } from '@/types'

interface Props {
  justeringsfaktorer: Justeringsfaktor[]
  prisantydning: number | null
  avvikProsent: number | null
}

// Plukker ut de mest utslagsgivende justeringsfaktorene og skriver en kort
// tekstanalyse som forklarer hvorfor estimatet trekker opp eller ned.
export default function Vurderingsnarrativ({
  justeringsfaktorer,
  prisantydning,
  avvikProsent,
}: Props) {
  const brukte = justeringsfaktorer.filter(
    (f) => f.brukt && f.justeringsProsent !== 0
  )
  if (brukte.length === 0) return null

  const total = brukte.reduce((s, f) => s + f.justeringsProsent, 0)
  const positive = brukte
    .filter((f) => f.justeringsProsent > 0)
    .sort((a, b) => b.justeringsProsent - a.justeringsProsent)
    .slice(0, 3)
  const negative = brukte
    .filter((f) => f.justeringsProsent < 0)
    .sort((a, b) => a.justeringsProsent - b.justeringsProsent)
    .slice(0, 3)

  // --- Intro: rammesetter avviket ---
  let intro: React.ReactNode
  if (prisantydning && avvikProsent !== null) {
    const abs = Math.abs(avvikProsent).toFixed(1)
    if (avvikProsent > 1) {
      intro = (
        <>
          Estimatet ligger{' '}
          <strong className="narrativ-delta pos">+{abs} %</strong> over meglers
          prisantydning.
        </>
      )
    } else if (avvikProsent < -1) {
      intro = (
        <>
          Estimatet ligger{' '}
          <strong className="narrativ-delta neg">−{abs} %</strong> under meglers
          prisantydning.
        </>
      )
    } else {
      intro = (
        <>
          Estimatet samsvarer tett med meglers prisantydning (avvik{' '}
          {avvikProsent > 0 ? '+' : ''}
          {avvikProsent.toFixed(1)} %).
        </>
      )
    }
  } else if (total > 0) {
    intro = (
      <>
        Justeringene løfter estimatet{' '}
        <strong className="narrativ-delta pos">+{total} %</strong> over basispris
        per m².
      </>
    )
  } else if (total < 0) {
    intro = (
      <>
        Justeringene trekker estimatet{' '}
        <strong className="narrativ-delta neg">{total} %</strong> under basispris
        per m².
      </>
    )
  } else {
    intro = (
      <>
        Justeringene balanserer hverandre ut — estimatet lander på basispris per
        m².
      </>
    )
  }

  // --- Drivers: hvilke faktorer trekker hvilken vei ---
  const renderList = (items: Justeringsfaktor[], cls: 'pos' | 'neg') =>
    items.map((f, i) => (
      <span key={f.navn}>
        {i > 0 && (i === items.length - 1 ? ' og ' : ', ')}
        <strong className={`narrativ-faktor ${cls}`}>{f.navn}</strong>{' '}
        <span className="narrativ-pct">
          ({f.justeringsProsent > 0 ? '+' : ''}
          {f.justeringsProsent} %)
        </span>
      </span>
    ))

  let drivers: React.ReactNode = null
  if (positive.length > 0 && negative.length > 0) {
    drivers = (
      <>
        {' '}
        Det som drar mest opp er {renderList(positive, 'pos')}, mens{' '}
        {renderList(negative, 'neg')} demper.
      </>
    )
  } else if (positive.length > 0) {
    drivers = <> Hele løftet kommer fra {renderList(positive, 'pos')}.</>
  } else if (negative.length > 0) {
    drivers = <> Hele nedsiden kommer fra {renderList(negative, 'neg')}.</>
  }

  // --- Ramme-setning: tolkning ift prisantydning ---
  let rammeSetning: React.ReactNode = null
  if (prisantydning && avvikProsent !== null) {
    if (avvikProsent > 3) {
      rammeSetning = (
        <>
          {' '}
          Sum av justeringene forklarer hvorfor modellen lander høyere enn
          megler — en budrunde over prisantydning framstår som realistisk.
        </>
      )
    } else if (avvikProsent < -3) {
      rammeSetning = (
        <>
          {' '}
          Modellen er mer avmålt enn megler. Vær varsom med bud langt over
          prisantydning uten å kunne peke på noe som ikke fanges av dataene.
        </>
      )
    }
  }

  return (
    <div className="panel narrativ-panel">
      <div className="panel-head">
        <h2>Vurdering</h2>
        <span className="hint">
          {total > 0
            ? 'Netto i pluss'
            : total < 0
              ? 'Netto i minus'
              : 'Netto i balanse'}
        </span>
      </div>
      <p className="narrativ-body">
        {intro}
        {drivers}
        {rammeSetning}
      </p>
    </div>
  )
}
