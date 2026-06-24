# Boligverdi

Datadrevet boligestimator for det norske markedet. Estimerer markedsverdi basert på faktiske salgspriser fra Kartverket, kombinert med egenskaper fra Finn-annonser og Matrikkelen.

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Kopier miljøvariabler
cp .env.example .env.local

# Start utviklingsserver
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Arkitektur

```
app/
  page.tsx               → Startside med søkeskjema
  resultat/[id]/page.tsx → Resultatside
  metodikk/page.tsx      → Forklaring av modellen
  api/
    analyze/route.ts     → Hoved-API: tar inn Finn-URL eller adresse

lib/
  finn-scraper.ts        → Henter og parser Finn-annonser (server-side)
  matrikkelen.ts         → Oppslag mot Kartverkets adresse-API
  kartverket.ts          → Henter sammenlignbare salg (comps)
  estimering.ts          → Selve verdiestimeringen

components/
  KartKomponent.tsx      → Leaflet-kart med comps-markeringer
  CompsTabell.tsx        → Tabell med sammenlignbare salg
  Justeringsliste.tsx    → Viser justeringsfaktorer

types/index.ts           → TypeScript-typer for hele appen
```

## Datakilder

| Kilde | Status | Brukes til |
|---|---|---|
| Finn.no | ✅ Server-side scraping | Prisantydning, egenskaper |
| Kartverkets adresse-API | ✅ Åpent API | Gnr/bnr-oppslag fra adresse |
| Kartverket tinglysning | ⚠️ Begrenset åpent API | Historiske salgspriser |
| Mockdata | ✅ For utvikling | Erstatter Kartverket i dev |

### Om tinglysningsdata

Kartverket tilbyr tinglysning av hjemmelsoverganger, men et søkbart API for
"alle salg i postnummer X" finnes ikke som åpent API per i dag. Alternativer:

- **Ambita** (https://www.ambita.com/) — kommersiell dataavtale
- **Eiendomsverdi.no** — kommersiell dataavtale
- Intern dataavtale via Schibsted/FINN

Sett `USE_MOCK_DATA=true` i `.env.local` for å bruke realistisk mockdata
under utvikling.

## Neste steg

- [ ] Dataavtale med Ambita eller Eiendomsverdi.no for reelle comps
- [ ] Koble Finn-scraper til faktisk URL-parsing (HTML endres jevnlig)
- [ ] Manuelt innskjema som fallback når scraping feiler
- [ ] Kalibrere justeringsfaktorer mot historiske data
- [ ] Støtte for eneboliger og rekkehus (ikke bare leiligheter)
- [ ] Utvide til flere geografier utover Oslo
