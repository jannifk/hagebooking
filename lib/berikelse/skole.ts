import { BerikelseResultat, Koordinater } from './types'

// TODO: Finne riktig åpent endepunkt for skoledata med koordinater.
// - wfs.geonorge.no/skwms1/wfs.skole og wfs.skoler gir "ukjent applikasjon"
// - UDIR (data.udir.no) eksponerer skole-registeret uten koordinater
// - Kandidater å sjekke:
//     * register.geonorge.no/data/documents — let etter ny WFS-URL
//     * kommune-spesifikke API-er (Oslo Origo)
//     * Statistisk sentralbyrå har skolekretser som GeoJSON
// Når endepunkt er verifisert: hent nærmeste barneskole og juster basert på
// avstand (<400 m: +2 %, <800 m: +1 %, >2000 m: −1 %).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function hentSkoleJustering(_k: Koordinater): Promise<BerikelseResultat> {
  return null
}
