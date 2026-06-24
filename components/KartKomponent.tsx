'use client'

import { useEffect, useRef } from 'react'
import { SammenlignbartSalg } from '@/types'
import { formaterPris } from '@/lib/estimering'

interface Props {
  comps: SammenlignbartSalg[]
  senterpunkt?: { lat: number; lng: number }
}

export default function KartKomponent({ comps, senterpunkt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const kartRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current || kartRef.current) return

    // Dynamisk import for å unngå SSR-problemer med Leaflet
    import('leaflet').then(L => {
      if (!containerRef.current) return

      // Fiks Leaflet standard ikon-problem med bundlere
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const compsmedKoord = comps.filter(c => c.koordinater)
      if (compsmedKoord.length === 0) return

      const senter = senterpunkt ?? compsmedKoord[0].koordinater!

      const kart = L.map(containerRef.current!).setView([senter.lat, senter.lng], 14)
      kartRef.current = kart

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(kart)

      // Marker for hvert comp
      compsmedKoord.forEach(comp => {
        const markering = L.circleMarker(
          [comp.koordinater!.lat, comp.koordinater!.lng],
          {
            radius: 8,
            fillColor: '#1d4ed8',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85,
          }
        ).addTo(kart)

        markering.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; min-width: 160px">
            <div style="font-weight: 600; margin-bottom: 4px">${comp.adresse}</div>
            <div style="color: #374151">${formaterPris(comp.salgspris)}</div>
            <div style="color: #9ca3af; font-size: 11px">${comp.bra} m² · ${comp.salgsdato}</div>
            <div style="color: #6b7280; font-size: 11px">${comp.prisPerKvm.toLocaleString('nb-NO')} kr/kvm</div>
          </div>
        `)
      })

      // Senterpunkt-markør (eiendom vi analyserer)
      if (senterpunkt) {
        L.marker([senterpunkt.lat, senterpunkt.lng])
          .addTo(kart)
          .bindPopup('<strong>Analysert eiendom</strong>')
      }
    })

    return () => {
      if (kartRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(kartRef.current as any).remove()
        kartRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
