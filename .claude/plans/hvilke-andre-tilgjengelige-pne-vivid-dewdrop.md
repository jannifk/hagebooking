# Utvide boligverdi med flere åpne datakilder

## Context

I dag justerer `beregnEstimat` (lib/estimering.ts) prisen basert på kun data som ligger i Finn-annonsen (etasje, balkong, oppussing, solforhold som kategorisk "god/middels/liten") + Matrikkel-byggeår. Det gir et forsiktig estimat, men flere sterke prisdrivere i Oslo er uberørt: kollektiv-nærhet, objektiv sol-innstråling, støy, flom-risiko, skole, luft og grønt.

Målet er å hente inn 7 åpne norske datakilder server-side i `/api/analyze` og legge hver som egen `Justeringsfaktor` i estimatet. Alle skal påvirke prisen direkte (samme mønster som dagens etasje/balkong), så brukeren ser ett samlet estimat med full transparens i justerings-listen.

## Datakilder (alle åpne, kommersiell bruk OK)

| # | Kilde | API | Justering | Merknad |
|---|-------|-----|-----------|---------|
| 1 | **Entur JourneyPlanner** | `https://api.entur.io/geocoder/v1/reverse` + stop_place query | T-bane <400 m: +5 %, <800 m: +3 %; buss <300 m: +1 % | `ET-Client-Name`-header. WGS84. |
| 2 | **PVGIS** (EU JRC) | `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc` | Årlig kWh/m² → kategori → −2…+3 % | Erstatt/supplerer kategorisk Finn-sol. |
| 3 | **NVE flomsoner** | `https://nve.geodataonline.no/arcgis/rest/services/Mapservices/Flomsoner/MapServer/identify` | 200-års sone: −5 %, 1000-års: −2 % | UTM 33N — krever koordinattransform (proj4). |
| 4 | **Miljødirektoratet støy** | WMS/WFS fra kartkatalog.miljodirektoratet.no | Lden >65 dB: −5 %, 60–65: −2 % | UTM 33N. Point-in-polygon. |
| 5 | **UDIR/GSI + Geonorge skoler** | `https://data.udir.no/` + Geonorge WFS "Skoler" | Innenfor topp-20 % skolekrets: +3 %; avstand <400 m: +1 % | Kombinér geometri + resultater. |
| 6 | **NILU luftkvalitet** | `https://api.nilu.no/aq/historical` | Årsgjennomsnitt NO2 >40 µg/m³: −2 %, >30: −1 % | Få stasjoner — interpoler nærmeste 2. |
| 7 | **OSM Overpass (grønt)** | `https://overpass-api.de/api/interpreter` | Park/Marka <200 m: +2 %; <500 m: +1 % | ODbL, krever attribusjon. |

## Arkitektur

**Ny katalog: `lib/berikelse/`** — én modul per kilde, samme signatur:
```typescript
type BerikelseInput = { lat: number; lng: number }
type BerikelseResultat = Justeringsfaktor | null  // null hvis API feiler

// lib/berikelse/entur.ts
export async function hentEnturJustering(input: BerikelseInput): Promise<BerikelseResultat>
// ...tilsvarende for pvgis, nve-flom, stoy, skole, nilu, gront
```

**Ny fil: `lib/berikelse/index.ts`** — kjører alle parallelt:
```typescript
export async function hentAlleBerikelser(input: BerikelseInput): Promise<Justeringsfaktor[]> {
  const resultater = await Promise.allSettled([
    hentEnturJustering(input),
    hentPvgisJustering(input),
    // ...
  ])
  return resultater
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<Justeringsfaktor>).value)
}
```

Bruker `Promise.allSettled` så én feilende kilde ikke dreper estimatet.

**Koordinattransform**: Legg til `proj4` som dep. Ny helper `lib/berikelse/geo.ts` med `wgs84TilUtm33(lat, lng)`.

## Filer som endres

| Fil | Endring |
|-----|---------|
| `app/api/analyze/route.ts` (etter linje ~55 der `eiendom` er hentet) | Kall `hentAlleBerikelser(eiendom.koordinater)` før `beregnEstimat`; send resultatet som ny param |
| `lib/estimering.ts` linje 15 (`EstimeringInput`) | Legg til `berikelser?: Justeringsfaktor[]` — appendes til `justeringer`-array etter eksisterende faktorer (linje 50–120) |
| `types/index.ts` linje 51 (`Justeringsfaktor`) | Utvid med `kategori?: 'bolig' \| 'transport' \| 'miljo' \| 'skole' \| 'risiko'` for gruppering i UI |
| `app/resultat/[id]/page.tsx` (eksisterer allerede — ikke lest, sjekk) | Gruppér justeringer etter `kategori` i visning |
| `package.json` | Legg til `proj4` |
| `.env.local` | Ingen nøkler nødvendig for noen av kildene (Entur krever bare `ET-Client-Name`-header — sett konstant) |

## Caching

Alle disse API-ene er sakte (200–2000 ms). Legg en enkel in-memory `Map<string, Justeringsfaktor>`-cache i hver modul med nøkkel `${lat.toFixed(4)},${lng.toFixed(4)}`. Unngår dobbelt-kall ved gjenbesøk innen samme server-instans. TTL trenger vi ikke i MVP — data endres sjelden.

## Graceful degradation

- Hvis `eiendom.koordinater === null`: hopp over hele berikelses-steget, estimat fortsetter som i dag.
- Hvis én kilde feiler: `Promise.allSettled` plukker bare de som lyktes.
- Feilede kilder logges men vises ikke i UI.

## Verifisering

1. Start dev-server via `preview_start next-dev` (allerede i launch.json).
2. Test med kjent adresse: `Thorvald Meyers gate 12, 0555 Oslo` — ventet:
   - Entur: +3–5 % (nær Birkelunden/Olaf Ryes plass)
   - PVGIS: nøytral/positiv (normal Oslo-breddegrad)
   - NVE flom: ingen justering (ikke flomutsatt)
   - Støy: varierer, Thorvald Meyers kan trigge −1 til −2 %
   - Grønt: +1 % (nær Sofienbergparken)
3. Test med adresse utenfor Oslo/ukjent — verifisér graceful degradation (estimat uten berikelser).
4. Drep Entur-API med feil URL lokalt → verifisér at estimatet fortsatt returnerer og de 6 andre er med.
5. Sjekk at `Justeringer`-listen på resultatside viser kategorigruppering.

## Rekkefølge (2–5 dager totalt)

1. **Dag 1**: Oppsett (`lib/berikelse/` skelett, proj4, `Promise.allSettled`-orkestrering). Implementer Entur + PVGIS.
2. **Dag 2**: NVE flom + Miljødir støy (felles UTM-transform-pattern).
3. **Dag 3**: OSM Overpass grønt + NILU luft.
4. **Dag 4**: UDIR/GSI skolekrets (mest komplekst — krever polygon-lookup mot skolekretser + resultat-join).
5. **Dag 5**: UI-grupperting på resultatside + verifisering.

## Bevisste utelatelser

- **Politi/kriminalitet**: Ingen åpent adresse-nivå API i Norge.
- **SSB grunnkrets-demografi**: Moderat signal, men kompliserer UI betydelig. Vent til MVP er ute.
- **Bildeanalyse av Finn-bilder**: Utenfor scope — krever LLM/vision.
