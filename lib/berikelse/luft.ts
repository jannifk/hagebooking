import { BerikelseResultat, Koordinater } from './types'

// TODO: NILU-API-et (api.nilu.no) har endret struktur — gamle /lookup/stations
// er 410 Gone, og /aq/historical krever nå autentisering (401).
// Alternativer å undersøke:
//   * Søk etter ny åpen NILU-tilgang (sannsynligvis nøkkel nødvendig)
//   * Miljødirektoratets luftkvalitet.no har sanntidsdata per stasjon
//   * EEA European Air Quality API (europa.eu)
// Når løst: hent årsgjennomsnitt NO2 fra nærmeste 1–2 stasjoner innen 5 km
// og juster: ≥40 µg/m³ = −2 %, ≥30 = −1 %.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function hentLuftJustering(_k: Koordinater): Promise<BerikelseResultat> {
  return null
}
