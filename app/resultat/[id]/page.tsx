'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AnalyseResultat } from '@/types'
import { formaterPris } from '@/lib/estimering'
import CompsTabell from '@/components/CompsTabell'
import Justeringsliste from '@/components/Justeringsliste'
import Vurderingsnarrativ from '@/components/Vurderingsnarrativ'

const KONFIDENS_TEKST: Record<'sterk' | 'middels' | 'svak', string> = {
  sterk: 'Sterk konfidens',
  middels: 'Middels konfidens',
  svak: 'Svak konfidens',
}

function formaterMillioner(n: number): { num: string; unit: string } {
  if (n >= 1_000_000) {
    const mill = n / 1_000_000
    return {
      num: mill.toLocaleString('nb-NO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      unit: 'mill',
    }
  }
  return { num: Math.round(n).toLocaleString('nb-NO'), unit: 'kr' }
}

export default function ResultatSide() {
  const params = useParams()
  const [data, setData] = useState<AnalyseResultat | null>(null)

  useEffect(() => {
    const lagret = sessionStorage.getItem(`analyse_${params.id}`)
    if (lagret) setData(JSON.parse(lagret))
  }, [params.id])

  if (!data) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Laster resultat…
      </div>
    )
  }

  const { finnAnnonse, eiendom, estimat, opprettet } = data
  const prisantydning = finnAnnonse?.prisantydning && finnAnnonse.prisantydning > 0 ? finnAnnonse.prisantydning : null
  const avvikProsent = prisantydning
    ? ((estimat.estimertVerdi - prisantydning) / prisantydning) * 100
    : null

  const bra = finnAnnonse?.bra ?? eiendom.bra ?? null
  const estimatPerKvm = bra ? Math.round(estimat.estimertVerdi / bra) : null

  const formatEstimat = formaterMillioner(estimat.estimertVerdi)
  const formatAsk = prisantydning ? formaterMillioner(prisantydning) : null

  // Range-indikator posisjon: estimat sitter ~midtveis (95 % CI)
  const rangeMidPct = 50
  // Dersom vi har prisantydning: plasser markør basert på hvor ask ligger i intervallet
  let askMarkerPct: number | null = null
  if (prisantydning) {
    const pct =
      ((prisantydning - estimat.nedreGrense) /
        (estimat.ovreGrense - estimat.nedreGrense)) *
      100
    askMarkerPct = Math.max(2, Math.min(98, pct))
  }

  return (
    <section className="result animate-fadein">
      {/* Breadcrumb + tittel + meta + konfidens */}
      <div className="result-head">
        <div>
          <div className="result-crumb">
            <Link href="/">← Ny analyse</Link>
            <span className="sep">/</span>
            {eiendom.postnummer} {eiendom.poststed?.toUpperCase() ?? ''}
            {eiendom.gnr > 0 && (
              <>
                <span className="sep">/</span>
                GNR {eiendom.gnr}
                <span className="sep">·</span>
                BNR {eiendom.bnr}
              </>
            )}
          </div>
          <h1 className="result-title">
            {finnAnnonse?.tittel || eiendom.adresse}
          </h1>
          <div className="result-meta">
            <span>{eiendom.adresse}</span>
            {finnAnnonse?.megler && (
              <>
                <span className="sep">·</span>
                <span>Megler: {finnAnnonse.megler}</span>
              </>
            )}
            {finnAnnonse?.finnkode && (
              <>
                <span className="sep">·</span>
                <span className="mono">FINN {finnAnnonse.finnkode}</span>
              </>
            )}
          </div>
        </div>

        <div className={`confidence-pill ${estimat.konfidens}`}>
          <span className="dot" aria-hidden />
          {KONFIDENS_TEKST[estimat.konfidens]}
          <span style={{ color: 'var(--muted)' }}>
            · {estimat.antallComps} salg
          </span>
        </div>
      </div>

      {/* Hero-estimat */}
      <div className="hero-estimate">
        <div className="estimate-main">
          <div className="estimate-label">Estimert markedsverdi</div>
          <div className="estimate-value">
            {formatEstimat.num}
            <span className="unit">{formatEstimat.unit}</span>
          </div>

          <div className="range-bar" aria-hidden>
            <div
              className="range-fill"
              style={{ left: '8%', right: '8%' }}
            />
            <div
              className="range-marker"
              style={{ left: `${rangeMidPct}%` }}
            />
            {askMarkerPct !== null && (
              <div
                className="range-marker"
                style={{
                  left: `${askMarkerPct}%`,
                  background: 'var(--text-soft)',
                  boxShadow: 'none',
                  opacity: 0.65,
                }}
              />
            )}
          </div>
          <div className="range-labels">
            <span>{formaterMillioner(estimat.nedreGrense).num} {formaterMillioner(estimat.nedreGrense).unit}</span>
            <span className="middle">95 % konfidensintervall</span>
            <span>{formaterMillioner(estimat.ovreGrense).num} {formaterMillioner(estimat.ovreGrense).unit}</span>
          </div>
        </div>

        <div className="estimate-compare">
          <div className="ask-label">Meglers prisantydning</div>
          {formatAsk ? (
            <>
              <div className="ask-value">{formaterPris(prisantydning!)}</div>
              {avvikProsent !== null && (
                <div
                  className={`ask-delta ${
                    avvikProsent > 0.5 ? 'over' : avvikProsent < -0.5 ? 'under' : 'flat'
                  }`}
                >
                  {avvikProsent > 0 ? '↑' : avvikProsent < 0 ? '↓' : '→'}{' '}
                  {avvikProsent > 0 ? '+' : ''}
                  {avvikProsent.toFixed(1)}% vs estimat
                </div>
              )}
              <p className="ask-interpretation">
                {avvikProsent === null
                  ? ''
                  : avvikProsent > 3
                  ? `Estimatet ligger ${avvikProsent.toFixed(1)} % over prisantydning. Realistisk budrunde-potensial.`
                  : avvikProsent < -3
                  ? `Estimatet ligger ${Math.abs(avvikProsent).toFixed(1)} % under prisantydning. Vær forsiktig med høye bud.`
                  : 'Estimatet samsvarer godt med prisantydningen.'}
              </p>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Ingen prisantydning å sammenligne med.
            </div>
          )}
        </div>
      </div>

      {/* KPI-strip */}
      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-label">Basis kr/m²</div>
          <div className="stat-val">
            {estimat.basisPrisPerKvm.toLocaleString('nb-NO')}
            <span className="unit">kr</span>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Estimat kr/m²</div>
          <div className="stat-val">
            {estimatPerKvm ? estimatPerKvm.toLocaleString('nb-NO') : '—'}
            <span className="unit">kr</span>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">BRA</div>
          <div className="stat-val">
            {bra ?? '—'}
            <span className="unit">m²</span>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Byggeår</div>
          <div className="stat-val">
            {eiendom.byggeaar ?? '—'}
          </div>
        </div>
      </div>

      {/* Justeringsfaktorer */}
      <Justeringsliste faktorer={estimat.justeringsfaktorer} />

      {/* Kort tekstanalyse: hva trekker estimatet opp/ned vs prisantydning */}
      <Vurderingsnarrativ
        justeringsfaktorer={estimat.justeringsfaktorer}
        prisantydning={prisantydning}
        avvikProsent={avvikProsent}
      />

      {/* Comps: kart + tabell */}
      <CompsTabell
        comps={estimat.comps}
        eiendomKoordinater={eiendom.koordinater}
        poststed={eiendom.poststed}
      />

      {/* Egenskaper fra annonsen */}
      {finnAnnonse && (
        <div className="panel">
          <div className="panel-head">
            <h2>Egenskaper fra annonsen</h2>
            <span className="hint">Kilde · Finn.no + Matrikkelen</span>
          </div>
          <div className="prop-grid">
            <PropCell label="Etasje" val={formatEtasje(finnAnnonse.etasje, finnAnnonse.antallEtasjer)} />
            <PropCell label="Balkong" val={formatBalkong(finnAnnonse.balkong, finnAnnonse.solforhold)} />
            <PropCell label="Solforhold" val={formatSol(finnAnnonse.solforhold)} />
            <PropCell label="Fellesgjeld" val={finnAnnonse.fellesgjeld > 0 ? formaterPris(finnAnnonse.fellesgjeld) : 'Ingen'} />
            <PropCell label="Felleskost/mnd" val={finnAnnonse.felleskostnader ? formaterPris(finnAnnonse.felleskostnader) : '—'} />
            <PropCell label="Oppusset" val={finnAnnonse.oppussingsaar?.toString() ?? '—'} />
            <PropCell label="Byggeår" val={eiendom.byggeaar?.toString() ?? '—'} />
            <PropCell label="Gnr/Bnr" val={eiendom.gnr > 0 ? `${eiendom.gnr}/${eiendom.bnr}` : '—'} />
            <PropCell label="Boligtype" val={capitalize(finnAnnonse.boligtype || eiendom.boligtype)} />
          </div>
        </div>
      )}

      <footer className="result-foot">
        Analyse generert {new Date(opprettet).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
        {' · '}Modell v3.2.1
        {' · '}MVP — Oslo-området
      </footer>
    </section>
  )
}

function PropCell({ label, val }: { label: string; val: string }) {
  return (
    <div className="prop-cell">
      <div className="prop-label">{label}</div>
      <div className="prop-val">{val}</div>
    </div>
  )
}

function formatEtasje(e: number | null, av: number | null): string {
  if (!e) return '—'
  return av ? `${e}. av ${av}` : `${e}.`
}

function formatBalkong(balkong: boolean, sol: string): string {
  if (!balkong) return 'Nei'
  if (sol === 'god') return 'Ja · sørvest'
  if (sol === 'middels') return 'Ja · øst/vest'
  if (sol === 'liten') return 'Ja · nord'
  return 'Ja'
}

function formatSol(s: string): string {
  switch (s) {
    case 'god': return 'God'
    case 'middels': return 'Middels'
    case 'liten': return 'Liten'
    default: return '—'
  }
}

function capitalize(s: string): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
