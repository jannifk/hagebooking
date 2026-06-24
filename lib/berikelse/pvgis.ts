import { BerikelseResultat, Koordinater, medCache } from './types'

const PVGIS = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc'

export async function hentPvgisJustering(k: Koordinater): Promise<BerikelseResultat> {
  return medCache('pvgis', k, async () => {
    const params = new URLSearchParams({
      lat: k.lat.toString(),
      lon: k.lng.toString(),
      peakpower: '1',
      loss: '14',
      outputformat: 'json',
      pvtechchoice: 'crystSi',
      mountingplace: 'building',
      fixed: '1',
      angle: '35',
      aspect: '0',
    })
    const res = await fetch(`${PVGIS}?${params}`)
    if (!res.ok) throw new Error(`PVGIS ${res.status}`)
    const data = await res.json()
    const kwhPerKwPerAar: number | undefined = data?.outputs?.totals?.fixed?.E_y
    if (!kwhPerKwPerAar) return null

    // Typisk Oslo: 800–950 kWh/kW/år. Bruk intervall mot justering.
    let prosent = 0
    let beskrivelse = ''
    if (kwhPerKwPerAar >= 950) {
      prosent = 3
      beskrivelse = `Svært god solinnstråling (${Math.round(kwhPerKwPerAar)} kWh/kW/år)`
    } else if (kwhPerKwPerAar >= 880) {
      prosent = 2
      beskrivelse = `God solinnstråling (${Math.round(kwhPerKwPerAar)} kWh/kW/år)`
    } else if (kwhPerKwPerAar >= 820) {
      prosent = 0
      beskrivelse = `Middels solinnstråling (${Math.round(kwhPerKwPerAar)} kWh/kW/år)`
    } else {
      prosent = -2
      beskrivelse = `Lav solinnstråling (${Math.round(kwhPerKwPerAar)} kWh/kW/år)`
    }

    return {
      navn: 'Solinnstråling',
      beskrivelse,
      justeringsProsent: prosent,
      brukt: prosent !== 0,
      kategori: 'miljo',
      kilde: 'PVGIS (EU JRC)',
    }
  })
}
