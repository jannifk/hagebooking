import { BerikelseResultat, Koordinater } from './types'

// TODO: Miljødirektoratets stoy-tjeneste har krevende strukter — identify-kallet
// på stoy/stoykart_strategisk_bane returnerer >18 MB per punkt-spørring selv
// med layers-filter, og treffer Next.js sin cache-grense. Vegtrafikkstøy ligger
// i NVDB (Statens vegvesen) som krever separat integrasjon.
// Neste steg: bruk WMS GetFeatureInfo med spesifikt lag-ID og eksplisitt INFO_FORMAT=application/json
// for å begrense responsen til attributter for punktet, ikke hele kartet.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function hentStoyJustering(_k: Koordinater): Promise<BerikelseResultat> {
  return null
}
