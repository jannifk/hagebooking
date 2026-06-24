'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const METODE_STEG = [
  {
    label: 'STEG 01',
    tittel: 'Hent annonse',
    desc: 'Finn-URL gir boligegenskaper, pris og lokasjon.',
  },
  {
    label: 'STEG 02',
    tittel: 'Finn matrikkel',
    desc: 'Kartverket gir bygg, tomt og historikk.',
  },
  {
    label: 'STEG 03',
    tittel: 'Velg comps',
    desc: '5–12 nylige salg innenfor 500 m og ±15 % BRA.',
  },
  {
    label: 'STEG 04',
    tittel: 'Juster & estimat',
    desc: 'Transport, miljø, skole og boligegenskaper vektes.',
  },
]

const TRUST_KPIS = [
  { num: '2 847', unit: null, label: 'Salg analysert denne uken' },
  { num: '±4,2', unit: '%', label: 'Median avvik mot faktisk salgspris' },
  { num: '11', unit: null, label: 'Datakilder for berikelse' },
  { num: '0', unit: 'kr', label: 'Provisjon — vi selger ikke bolig' },
]

export default function Startside() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeil(null)

    const trimmet = input.trim()
    if (!trimmet) return

    const erFinnUrl = trimmet.includes('finn.no')
    setLaster(true)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          erFinnUrl ? { finnUrl: trimmet } : { adresse: trimmet }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        setFeil(
          data.error + (data.detaljer ? ` — ${data.detaljer}` : '')
        )
        return
      }

      sessionStorage.setItem(`analyse_${data.id}`, JSON.stringify(data))
      router.push(`/resultat/${data.id}`)
    } catch {
      setFeil('Noe gikk galt. Sjekk internettforbindelsen og prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <section className="landing">
      <div className="bg-grid" aria-hidden />

      <span className="landing-eyebrow">
        <span className="dot" aria-hidden />
        Live · 2 847 Oslo-salg indeksert denne uken
      </span>

      <h1>
        Hva er boligen <em>faktisk</em> verdt?
      </h1>

      <p className="landing-sub">
        Megleren er ikke objektiv — hen er på oppdrag for selger, og
        prisvurderingen starter ofte der selger ønsker å lande. Vi har
        ingen oppdragsgiver. Boligverdi svarer likt uansett hvem som
        spør, og bygger på tinglyste salgspriser og{' '}
        <Link href="/metodikk" className="sub-link">
          11 åpne datakilder
        </Link>
        .
      </p>

      <form className="search" onSubmit={handleSubmit} role="search">
        <span className="search-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Thorvald Meyers gate 42 B, 0555 Oslo — eller lim inn Finn-URL"
          aria-label="Adresse eller Finn-URL"
        />
        <button type="submit" disabled={laster || !input.trim()}>
          {laster ? (
            <>
              <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Analyserer…
            </>
          ) : (
            <>
              Analyser
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      <p className="search-hint">
        → <span>Lim inn en Finn-annonse</span> for raskeste treff, eller
        skriv adressen direkte
      </p>

      {feil && <div className="search-error">{feil}</div>}

      <div className="trust-row">
        {TRUST_KPIS.map((k) => (
          <div key={k.label} className="trust-cell">
            <div className="trust-num">
              {k.num}
              {k.unit && <span className="unit">{k.unit}</span>}
            </div>
            <div className="trust-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="method-strip" id="metodikk">
        {METODE_STEG.map((steg) => (
          <div key={steg.label} className="method-step">
            <div className="method-step-label">{steg.label}</div>
            <div className="method-step-title">{steg.tittel}</div>
            <div className="method-step-desc">{steg.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
