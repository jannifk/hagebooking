# DESIGN: Salgsoppgave-analyse

> **Status:** Utkast. Noen beslutninger er avhengige av åpne spørsmål (se
> [§12](#12-åpne-spørsmål-blokkerer-kode)).
>
> **Les først:** [`salgsoppgave-analyse.md`](./salgsoppgave-analyse.md) — product
> brief og krav. Dette dokumentet forholder seg til det som gitt og tar
> arkitekturbeslutningene.

## Innhold

1. [Hensikt og skop](#1-hensikt-og-skop)
2. [Beslutninger i sammendrag](#2-beslutninger-i-sammendrag)
3. [Pipeline-oversikt](#3-pipeline-oversikt)
4. [Arkitekturvalg](#4-arkitekturvalg)
5. [Datamodell og skjemaversjonering](#5-datamodell-og-skjemaversjonering)
6. [Orkestrering](#6-orkestrering-synkron-vs-asynkron)
7. [Modulstruktur](#7-modulstruktur)
8. [Integrasjon mot eksisterende estimering](#8-integrasjon-mot-eksisterende-estimering)
9. [Testing og evaluering](#9-testing-og-evaluering)
10. [PII, personvern og sikkerhet](#10-pii-personvern-og-sikkerhet)
11. [Observability og kostnadskontroll](#11-observability-og-kostnadskontroll)
12. [Åpne spørsmål (blokkerer kode)](#12-åpne-spørsmål-blokkerer-kode)
13. [Milepæler](#13-milepæler)

---

## 1. Hensikt og skop

Dette dokumentet beskriver hvordan vi bygger salgsoppgave-analysen som første
iterasjon (MVP). Omfanget fra briefen:

- Kun PDF-opplasting.
- Kun to dokumenttyper: **tilstandsrapport** og **informasjon fra forretningsfører**.
- Regelmotor med eksplisitte vekter (ikke ML).
- UI integrert i eksisterende `/resultat/[id]`-side.

Alt annet — nabolagsprofil, energiattest, årsberetning, byggesaker osv. —
designes inn (modulstruktur, skjemaer, signal-enum kan utvides) men leveres ikke
i MVP.

## 2. Beslutninger i sammendrag

| # | Beslutning | Valg | Kort rasjonale |
|---|------------|------|----------------|
| D1 | Filopplasting | Next.js Route Handler + S3-kompatibel store | Ingen store-lib i dag; S3 er standard, enkel å kryptere og retention-styre |
| D2 | PDF-tekst uttrekk | `pdfjs-dist` for digital tekst + Azure Document Intelligence for OCR/layout | Hybrid gir lav kost der tekst er digital; Azure har sterk norsk-støtte og returnerer layout |
| D3 | Dokument-splitt (samlet PDF → underdokumenter) | Tekstbasert (kjente overskrifter) + LLM-bekreftelse på tvilstilfeller | Samlet PDF har standardiserte forsider på hvert underdokument |
| D4 | Dokumenttype-klassifisering | Regex-/keyword-first, LLM-fallback | 80 % av underdokumentene kan identifiseres på forsiden alene |
| D5 | Strukturert uttrekk (LLM) | Claude Sonnet via Anthropic API, Zod-validerte schemas, tool-use | Norsk fagspråk er godt representert; tool-use gir typed JSON ut |
| D6 | PII-håndtering mot LLM | Redaksjonslag foran alle LLM-kall + databehandleravtale | Må til for GDPR |
| D7 | Signalberegning | Deterministisk TS, en fil per dokumenttype | Lett å teste, revidere og skrive om uten å endre uttrekk |
| D8 | Regelmotor | Egen modul `lib/salgsoppgave/pricing-rules.ts` med eksplisitt `VEKTER`-konstant | Isolert fra `beregnEstimat`, lett å endre uten å røre kjernemodellen |
| D9 | Integrasjon mot `beregnEstimat` | Nytt input-felt `salgsoppgaveSignaler: Justeringsfaktor[]`, appendes i `justeringer`-lista | Samme kontrakt som `berikelser`; null endring i frontend |
| D10 | Orkestrering | Asynkron med job-queue og polling fra frontend | OCR + LLM kan ta 30–90 s; synkron går ikke |
| D11 | Job-state | Redis-backed (foreslått) | Single-instance in-memory er for skjørt for prod; DB er overkill |
| D12 | Testing | Vitest for enhetstester, snapshot-tester for uttrekk, egen eval-suite | Ingen test-stack i repo i dag; Vitest er rask og Jest-kompatibel |
| D13 | Skjemaversjonering | SemVer per Zod-schema, persistert med hver ekstraksjon | Må kunne reprosessere eldre vedlegg når schema endres |

Uthevede beslutninger (D2, D5, D10, D11) forutsetter svar på åpne spørsmål i
[§12](#12-åpne-spørsmål-blokkerer-kode).

## 3. Pipeline-oversikt

```
                ┌────────────────────────────────────────────────┐
                │  Frontend: /resultat/[id]                      │
                │  — "Last opp salgsoppgave"-CTA                 │
                └──────────────┬─────────────────────────────────┘
                               │ POST /api/salgsoppgave/upload
                               │ multipart { fil, resultatId }
                               ▼
        ┌──────────────────────────────────────────────┐
        │  Upload-handler                              │
        │  • Validér type/størrelse                    │
        │  • Strøm til S3 → {assessmentId}/raw.pdf     │
        │  • Enqueue job → Redis                       │
        │  • Returnér { jobId }                        │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  Worker / inline job runner                  │
        │  1. Preprosessering (tekst + evt. OCR)       │
        │  2. Splitt i underdokumenter                 │
        │  3. Klassifiser dokumenttyper                │
        │  4. Strukturert uttrekk per dokumenttype     │
        │  5. Produser PricingSignal[]                 │
        │  6. Map til Justeringsfaktor[]               │
        │  7. Reberegn estimat via beregnEstimat()     │
        │  8. Skriv resultat til job-store             │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
                  ┌─────────────────────────────┐
                  │ Frontend poller:            │
                  │ GET /api/salgsoppgave/:job  │
                  │ → status + evt. resultat    │
                  └─────────────────────────────┘
```

Stegene 1–6 er idempotente og rene funksjoner (gitt samme rå-PDF). Steg 7 er
også ren — den kaller inn i `beregnEstimat` med de samme Finn/Matrikkel-dataene
som allerede ligger i `AnalyseResultat`.

## 4. Arkitekturvalg

### 4.1 Upload og lagring (D1)

**Valg:** Next.js Route Handler tar imot `multipart/form-data` og strømmer rå
PDF direkte til en S3-bucket. Metadata legges i Redis.

- Nøkkelstruktur i S3:
  `salgsoppgave/{assessmentId}/{attachmentId}/raw.pdf`
- Etter preprosessering:
  `salgsoppgave/{assessmentId}/{attachmentId}/pages/{n}.json` (tekst + bbox)
- Kryptert at rest (SSE-KMS). Signed URLs hvis vi senere trenger å vise PDF i UI.

**Retention:** **30 dager** etter siste tilknyttede analyse. Begrunnelse:
brukeren kan trenge å re-kjøre analysen eller se kilde-sitater, men vi ønsker
ikke å holde PII lenger enn nødvendig. Må bekreftes av juridisk — se §12.

**Vurderte alternativer:**

- *Lokal disk/tmpfs:* raskt, men overlever ikke deploy/restart og skalerer ikke.
  Kan være greit i dev, men vi bruker S3 fra dag én for å unngå to separate
  kodestier.
- *Database BLOB:* dårlig for 5–10 MB-filer. S3 er billigere og bedre.

### 4.2 PDF-preprosessering (D2)

**Valg:** Hybrid.

1. Prøv `pdfjs-dist` for å trekke ut digital tekst.
2. Mål hvor mye tekst som ble funnet per side.
3. Hvis en side har < 50 tegn tekst eller under 30 % dekning av arealet → send
   den siden til **Azure Document Intelligence** (OCR + layout).

Vi får ut per side:

```ts
interface SidInnhold {
  sideNr: number
  tekst: string
  blokker: TekstBlokk[]   // med bounding box i pt
  kilde: 'digital' | 'ocr'
  tillit: number           // 0–1
}

interface TekstBlokk {
  tekst: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
  sideNr: number
}
```

**Hvorfor ikke bare OCR alt:** Azure Document Intelligence koster ca. 1,50 USD
per 1000 sider. En analyse på 80 sider = 0,12 USD + LLM. For digitale PDF-er kan
vi spare hele OCR-kostnaden.

**Hvorfor ikke bare `pdfjs-dist`:** ca. 40 % av sidene i reelle
tilstandsrapporter er skannede bilder. Uten OCR mister vi de fleste
TG-anmerkningene.

**Hvorfor Azure over AWS Textract / Google Document AI:**

- Azure har sterkest norsk-støtte og håndterer blandet bokmål/nynorsk bra.
- Layout-modellen gir tabell-struktur ut av boksen (kritisk for TG-tabeller og
  regnskap).
- Schibsted har allerede Azure-avtaler.

Beslutningen er reversibel — wrapper-modulen `lib/salgsoppgave/ocr.ts` gir oss
én byttepunkt-funksjon.

### 4.3 Dokument-splitt (D3)

En samlet PDF er 5–15 underdokumenter. Strategi:

1. **Regex-deteksjon** av forside-overskrifter med høy presisjon:
   - `/^\s*TILSTANDSRAPPORT/im`
   - `/^\s*EGENERKLÆRING/im`
   - `/^\s*INFORMASJON FRA FORRETNINGSFØRER/im`
   - `/^\s*ÅRSREGNSKAP/im`
   - …osv.
2. **Sidelogikk:** en match tyder på at et nytt underdokument starter her.
   Samlet PDF har ofte tom side eller meglerkolofon rett før hvert underdokument
   — disse brukes som sekundær signal.
3. **LLM-bekreftelse** for tvilstilfeller: send første 2 sider av et antatt
   underdokument til en liten `classifyDocumentType`-prompt og få et
   dokumenttype-svar med konfidens.

Output:

```ts
interface Underdokument {
  id: string
  startSide: number
  sluttSide: number
  type: DokumentType | 'ukjent'
  klassifiseringsTillit: number
}
```

**Alternativer vurdert:**

- *Ren LLM-splitt:* dyrt (80 sider gjennom LLM bare for splitt), treg.
- *Ren bildebasert:* bildeanalyse på layout-endringer er støyete og gir falske
  splitter på midten av lange tabeller.

Regex gir 80 % av splittene gratis; LLM fanger opp resten.

### 4.4 Dokumenttype-klassifisering (D4)

Samme strategi som §4.3: regex/keyword på første side → LLM fallback.

`DokumentType`-enum (MVP-relevante i **fet**):

```ts
export type DokumentType =
  | 'tilstandsrapport'        // ← MVP
  | 'informasjon-forretningsforer'  // ← MVP
  | 'egenerklaering-selger'
  | 'meglers-verdivurdering'
  | 'nabolagsprofil'
  | 'reguleringskart'
  | 'energiattest'
  | 'losore-tilbehor'
  | 'budskjema'
  | 'arsberetning'
  | 'arsregnskap'
  | 'arsmoteprotokoll'
  | 'laanedetaljer-fellesgjeld'
  | 'ferdigattest'
  | 'reseksjonering'
  | 'branninstruks'
  | 'vedtekter'
  | 'annet'
```

MVP produserer signaler kun for de to uthevede typene. Alle andre klassifiseres
men ignoreres i signalberegningen — eksplisitt med en TODO-log slik at vi ser
hvilke dokumenter brukerne laster opp og kan prioritere neste dokumenttype.

### 4.5 Strukturert uttrekk (D5)

**Valg:** Claude Sonnet via Anthropic API, med Zod-validerte JSON-schemas og
tool-use.

**Prinsipp:** én schema per dokumenttype. Uttrekk kjøres kun på sider som tilhører
et underdokument med kjent type.

Eksempel for tilstandsrapport (forenklet):

```ts
// lib/salgsoppgave/schemas/tilstandsrapport.ts
import { z } from 'zod'

export const TgVurderingSchema = z.object({
  rom: z.string(),                      // "Bad, 1. etasje"
  bygningsdel: z.string(),              // "Membran og sluk"
  tilstandsgrad: z.enum(['TG0', 'TG1', 'TG2', 'TG3', 'TG_IU']),
  anmerkning: z.string(),               // takstmannens tekst
  tiltak: z.string().nullable(),
  kostnadsintervall: z.enum([
    'under-20k',
    '20-100k',
    '100-200k',
    '200-500k',
    'over-500k',
    'ikke-angitt',
  ]),
  sitat: z.string(),                    // direkte fra dokumentet
  sideNr: z.number().int().positive(),
})

export const TilstandsrapportSchema = z.object({
  takstIngeniør: z.string().nullable(),
  befaringsdato: z.string().nullable(), // YYYY-MM-DD
  tgVurderinger: z.array(TgVurderingSchema),
  byggeårKomponenter: z.record(z.string(), z.number().int().nullable()),
  // f.eks. { "bad": 2018, "kjøkken": null, "tak": 2012 }
  hmsAvvik: z.array(z.object({
    beskrivelse: z.string(),
    alvorlighet: z.enum(['lav', 'middels', 'høy']),
    sitat: z.string(),
    sideNr: z.number().int().positive(),
  })),
  schemaVersjon: z.literal('1.0.0'),
})

export type Tilstandsrapport = z.infer<typeof TilstandsrapportSchema>
```

**Prompt-oppbygging:**

- Systemprompt definerer rolle, output-format, forbud mot hallusinasjon, og
  norsk fagterminologi.
- Bruker-melding inneholder per-side tekst med sidenummer-anker
  (`[side 12]`).
- Tool-use tvinger strukturert output som valideres mot Zod.
- Rejection: hvis et påstått sitat ikke finnes i inputteksten (string match
  etter trimming), avvises ekstraksjonen. Retry 1x med eksplisitt feedback.

**Hvorfor Claude Sonnet:**

- Empirisk sterk på norsk fagspråk (bedre enn Haiku, dyrere enn Haiku men
  billigere enn Opus).
- Tool-use med strict JSON gir få parsing-feil.
- Schibsted har databehandleravtale (må bekreftes — se §12).

**Alternativer vurdert:**

- *GPT-4o:* likeverdig kvalitet, men rutingen vår er allerede satt opp mot
  Anthropic. Bytteregel bør holdes åpen via `lib/salgsoppgave/llm.ts`.
- *Selvhostet Llama 3.1 70B:* full PII-kontroll, men norsk fagspråk er
  betydelig svakere i benchmarks vi har sett. Kan være Phase 2.
- *Finetunet domain-model:* ideelt, men vi har ikke fasit-data nok til
  finetuning enda.

**PII-redaksjon før LLM-kall (D6):** Se §10.

### 4.6 Signalberegning (D7)

Deterministisk TS. Én fil per dokumenttype i `lib/salgsoppgave/signaler/`:

```ts
// lib/salgsoppgave/signaler/fra-tilstandsrapport.ts
import { Tilstandsrapport } from '../schemas/tilstandsrapport'
import { PricingSignal } from '../types'

export function signalerFraTilstandsrapport(
  rapport: Tilstandsrapport
): PricingSignal[] {
  const signaler: PricingSignal[] = []

  // Hvert TG2/TG3-avvik → ett signal
  for (const tg of rapport.tgVurderinger) {
    if (tg.tilstandsgrad === 'TG2' || tg.tilstandsgrad === 'TG3') {
      signaler.push({
        id: `tg-${tg.sideNr}-${slug(tg.bygningsdel)}`,
        type: 'tilstandsgrad-avvik',
        retning: 'negativ',
        magnitudeNok: kostnadsintervallTilNok(tg.kostnadsintervall),
        tillit: tg.kostnadsintervall === 'ikke-angitt' ? 0.4 : 0.75,
        kildeSitat: {
          tekst: tg.sitat,
          sideNr: tg.sideNr,
          dokumentType: 'tilstandsrapport',
        },
        detaljer: { rom: tg.rom, bygningsdel: tg.bygningsdel, tg: tg.tilstandsgrad },
      })
    }
  }

  // Gammelt bad/kjøkken
  for (const [komponent, år] of Object.entries(rapport.byggeårKomponenter)) {
    if (år && new Date().getFullYear() - år > 25) {
      signaler.push({
        id: `alder-${komponent}`,
        type: 'komponent-alder',
        retning: 'negativ',
        magnitudeNok: komponentAlderKost(komponent, år),
        tillit: 0.7,
        kildeSitat: { /* … */ },
      })
    }
  }

  return signaler
}
```

**Hvorfor ikke legge dette inn i LLM-prompten?**

Fordi regler skal være reviderbare, testbare, og versjonerbare uten å endre LLM.
Hvis vi flytter regler inn i prompten blir det umulig å kjøre enhetstester og å
sporingsbasert diff-e hva som endret seg mellom to versjoner.

### 4.7 Regelmotor og vekter (D8)

**Valg:** egen modul `lib/salgsoppgave/pricing-rules.ts` som tar
`PricingSignal[]` og produserer `Justeringsfaktor[]` som kan mates inn i
`beregnEstimat`.

Regler lever i en eksplisitt `VEKTER`-konstant:

```ts
// lib/salgsoppgave/pricing-rules.ts

export const VEKTER = {
  versjon: '1.0.0',
  tilstandsgrad: {
    TG2: { baseNedjustering: -1.5, multiplikatorFraKostnad: 0.8 },
    TG3: { baseNedjustering: -3.0, multiplikatorFraKostnad: 1.2 },
  },
  komponentAlder: {
    bad: { perÅrOver25: -0.15, maks: -4 },
    kjøkken: { perÅrOver25: -0.1, maks: -3 },
  },
  fellesgjeld: {
    terskelForPåslag: 200_000,    // under dette er det nøytralt
    prosentPerMNokOverTerskel: -0.4,
  },
  fellesKostnader: {
    medianNokPerMåned: 5500,       // benchmark
    prosentPer500NokOverMedian: -0.3,
  },
} as const
```

Outputen mapper hver signal til en `Justeringsfaktor` med `kategori` i det
utvidede enumet (se §5):

```ts
{
  navn: 'Bad TG2 · membran',
  beskrivelse: 'Takstmann angir TG2 på membran og sluk...',
  justeringsProsent: -2.4,
  brukt: true,
  kategori: 'tilstand',
  kilde: 'Salgsoppgave · s. 18 · sig_7a3f',
}
```

Regelmotoren versjoneres: `VEKTER.versjon` bumpes ved endringer, og versjonen
persisteres sammen med hvert kjørte estimat slik at vi kan spore
"hvilken regel-versjon lagde dette tallet".

### 4.8 Integrasjon mot `beregnEstimat` (D9)

Se [§8](#8-integrasjon-mot-eksisterende-estimering) for detaljer. Kort
oppsummering: nytt input-felt, ingen endring i frontend-kontrakt.

## 5. Datamodell og skjemaversjonering

### 5.1 Utvidelse av `Justeringskategori`

Som beskrevet i briefen (§"Utvidelse av Justeringskategori"):

```ts
export type Justeringskategori =
  | 'bolig' | 'transport' | 'miljo' | 'skole'    // eksisterende
  | 'tilstand'            // TG-avvik, HMS, slitasje
  | 'fellesskapsokonomi'  // fellesgjeld, felleskost, fondsdekning
  | 'energi'              // energikarakter, ventilasjon, varmepumpe
  | 'lovlighet'           // ferdigattest, reseksjonering, bruksendring
```

`KATEGORI_REKKEFOLGE` og `KATEGORI_LABEL` i `Justeringsliste.tsx` utvides
tilsvarende.

### 5.2 Nye typer

Alt nedenfor går i `types/index.ts` eller i `lib/salgsoppgave/types.ts`. Valg:
nye salgsoppgave-typer plasseres i **`lib/salgsoppgave/types.ts`** for å ikke
blåse opp `types/index.ts` som i dag er kjerne-domenet.

```ts
// lib/salgsoppgave/types.ts

export type DokumentType = /* se §4.4 */

export interface PricingSignal {
  id: string                          // unik, stabil på tvers av reprosessering
  type: PricingSignalType             // enum — se under
  retning: 'positiv' | 'negativ' | 'nøytral'
  magnitudeNok?: number               // estimert verdi-påvirkning
  tillit: number                      // 0–1
  kildeSitat: {
    tekst: string
    sideNr: number
    dokumentType: DokumentType
    bbox?: BoundingBox                // for PDF-highlight i UI (Phase 2)
  }
  detaljer?: Record<string, unknown>  // type-spesifikk kontekst
}

export type PricingSignalType =
  | 'tilstandsgrad-avvik'
  | 'komponent-alder'
  | 'hms-avvik'
  | 'fellesgjeld'
  | 'fellesKostnader'
  | 'rente-fellesgjeld'
  | 'energikarakter'
  | 'ventilasjon'
  | 'lovlighet-avvik'
  | 'planlagt-rehabilitering'
  // utvides

export interface SalgsoppgaveAnalyse {
  assessmentId: string                // kobling til AnalyseResultat
  attachmentId: string
  filnavn: string
  filstorrelseBytes: number
  sideantall: number
  analysertAt: string
  pipelineVersjon: string             // f.eks. "1.0.0"
  underdokumenter: Underdokument[]
  signaler: PricingSignal[]
  forrigeEstimatNok: number
  nyttEstimatNok: number
  endringProsent: number
  feilOgMangler: AnalyseMangel[]      // f.eks. "tilstandsrapport var > 12 mnd gammel"
}

export interface AnalyseMangel {
  type: 'manglende-dokument' | 'utdatert-rapport' | 'usikker-klassifisering' | 'lav-ocr-kvalitet'
  detaljer: string
  påvirkning: 'blokkerende' | 'advarsel'
}
```

`AnalyseResultat` utvides med en optional:

```ts
export interface AnalyseResultat {
  // …eksisterende felt
  salgsoppgave?: SalgsoppgaveAnalyse | null
}
```

### 5.3 Skjemaversjonering (D13)

- Hver Zod-schema har `schemaVersjon: z.literal('X.Y.Z')`.
- Patch-bumps (1.0.1): non-breaking endringer (nye optional felt).
- Minor (1.1.0): nye required felt med migrasjon.
- Major (2.0.0): breaking endringer → eldre vedlegg må reprosesseres.
- Pipeline-versjon separat (`pipelineVersjon` i `SalgsoppgaveAnalyse`) og bumpes
  når hele flyten endres (OCR-leverandør byttet, LLM-versjon byttet, regelmotor
  endret).
- Lagret resultat inneholder alle versjonsnumre. "Reprosesser"-funksjon kan
  filtrere på versjon og kjøre på nytt.

## 6. Orkestrering (synkron vs asynkron)

### 6.1 Hvorfor asynkron (D10)

Målt/anslått latency per steg for et 80-siders vedlegg:

| Steg | Tid (anslått) |
|------|---------------|
| Upload + S3-write | 1–3 s |
| PDF-tekst (pdfjs) | 2–5 s |
| OCR (Azure) for ~30 skannede sider | 10–20 s |
| Dokument-splitt + klassifisering | 3–8 s |
| Uttrekk via Claude (2 dokumenttyper, ~30 sider relevant tekst) | 15–40 s |
| Signalberegning + reberegning | < 1 s |
| **Totalt** | **ca. 30–80 s** |

Synkron HTTP-request er utelukket. Vercel/proxy-timeouts er typisk 30 s; selv
uten timeout-problem er UX for en halv-minutters spinner dårlig.

### 6.2 Job-kø og state (D11)

**MVP:** Redis som både job-queue (BullMQ eller Upstash Queue) og job-state
store.

- Job persisteres med `{ id, status, progress, currentStep, result?, error? }`.
- Worker kan være samme Node.js-prosess i starten (Next.js custom server), men
  designet må tåle at den flyttes ut i en egen worker senere.

**Frontend-polling:**

- `GET /api/salgsoppgave/:jobId` returnerer `{ status, currentStep, progressPct,
  result?, error? }`.
- Poll hvert 2. sekund inntil `status === 'done' | 'failed'`.
- SSE vurdert og forkastet for MVP — polling er enklere, og vi snakker om <2
  minutter per job.

**Alternativer vurdert:**

- *In-memory Map<jobId, state>:* overlever ikke restart eller flere instanser.
  Avvist.
- *Postgres som kø:* fungerer, men vi har ikke Postgres i stacken ennå. Ville
  legge på mer infra enn Redis.
- *Cloudflare Queues / AWS SQS:* overkill for én job-type med < 10 req/min i
  oppstart.

### 6.3 Progress-rapportering

Job-state inneholder `currentStep: PipelineSteg` der `PipelineSteg` er ett av:

```ts
type PipelineSteg =
  | 'lagt-i-kø'
  | 'leser-pdf'
  | 'ocr'
  | 'splitter-dokumenter'
  | 'klassifiserer'
  | 'leser-tilstandsrapport'
  | 'leser-forretningsforer'
  | 'beregner-signaler'
  | 'reberegner-estimat'
  | 'ferdig'
```

Frontend viser stegvis progress slik at brukeren ser noe skje. Modellen er
visuelt lik hva OpenAI/Anthropic viser ved lange prompts.

## 7. Modulstruktur

```
app/
  api/
    salgsoppgave/
      upload/route.ts            ← POST — tar imot fil, enqueuer job
      [jobId]/route.ts           ← GET — job-status

lib/
  salgsoppgave/
    index.ts                     ← public API: analyserSalgsoppgave()
    types.ts                     ← PricingSignal, SalgsoppgaveAnalyse, osv.
    ocr.ts                       ← Azure Document Intelligence-wrapper
    pdf.ts                       ← pdfjs-wrapper + hybrid-logikk
    splitt.ts                    ← samlet PDF → underdokumenter
    klassifisering.ts            ← regex + LLM-fallback
    llm.ts                       ← Anthropic-wrapper, PII-redaksjon
    pii.ts                       ← redaksjonsregler (personnr, navn, osv.)
    pricing-rules.ts             ← VEKTER + regelmotor
    schemas/
      tilstandsrapport.ts
      forretningsforer.ts        ← (MVP)
      _base.ts                   ← delte schemas (Sitat, BoundingBox)
    signaler/
      fra-tilstandsrapport.ts
      fra-forretningsforer.ts    ← (MVP)
      index.ts                   ← aggregator

components/
  SalgsoppgaveCta.tsx            ← CTA-boks når analyse mangler
  SalgsoppgaveStatus.tsx         ← progress-visning under jobben
  SalgsoppgaveResultat.tsx       ← funn + sitat + reberegnet estimat

docs/
  salgsoppgave-analyse.md        ← brief (eksisterer)
  DESIGN-salgsoppgave.md         ← dette dokumentet
```

**Prinsipp:** `lib/salgsoppgave/` er domene-isolert. `beregnEstimat` er eneste
grenseoverskridelse, og den er en éns-veis-funksjonskall. Ingen sirkelimporter.

## 8. Integrasjon mot eksisterende estimering

### 8.1 Endring i `beregnEstimat`

Dagens signatur:

```ts
function beregnEstimat(input: {
  finnAnnonse: FinnAnnonse | null
  eiendom: MatrikkelEiendom
  comps: SammenlignbartSalg[]
  berikelser?: Justeringsfaktor[]
}): Estimat
```

Ny signatur:

```ts
function beregnEstimat(input: {
  finnAnnonse: FinnAnnonse | null
  eiendom: MatrikkelEiendom
  comps: SammenlignbartSalg[]
  berikelser?: Justeringsfaktor[]
  salgsoppgaveSignaler?: Justeringsfaktor[]   // ← ny
}): Estimat
```

`salgsoppgaveSignaler` appendes i `justeringer`-lista på nøyaktig samme måte som
`berikelser` i dag, like før TRINN 3 (`totalJusteringProsent`-beregning).

**Hvorfor ikke bare gjenbruke `berikelser`?** Fordi semantikken er annerledes —
`berikelser` er åpne datakilder koblet på koordinater; `salgsoppgaveSignaler`
har sitatsporing og kan være mye høyere per boligs (10+ signaler). Vi vil ha
dem adskilt for observability og for at `Justeringsliste` senere kan vise dem
ulikt.

### 8.2 Flyt i `/api/salgsoppgave/upload` → worker

```ts
// lib/salgsoppgave/index.ts (forenklet)

export async function analyserSalgsoppgave(input: {
  rawPdf: Buffer
  eksisterendeResultat: AnalyseResultat
}): Promise<SalgsoppgaveAnalyse> {
  const sider = await lesPdfSider(input.rawPdf)           // §4.2
  const underdokumenter = await splittOgKlassifiser(sider) // §4.3-4.4
  const uttrekk = await kjørUttrekk(sider, underdokumenter) // §4.5

  const signaler = [
    ...signalerFraTilstandsrapport(uttrekk.tilstandsrapport),
    ...signalerFraForretningsfører(uttrekk.forretningsfører),
  ]

  const faktorer = signalerTilJusteringsfaktorer(signaler)

  const forrigeEstimat = input.eksisterendeResultat.estimat.estimertVerdi
  const nyttEstimat = beregnEstimat({
    finnAnnonse: input.eksisterendeResultat.finnAnnonse,
    eiendom: input.eksisterendeResultat.eiendom,
    comps: input.eksisterendeResultat.estimat.comps,
    berikelser: input.eksisterendeResultat.estimat.justeringsfaktorer
      .filter(f => f.kategori !== 'bolig'), // allerede brukt berikelser
    salgsoppgaveSignaler: faktorer,
  })

  return {
    /* … SalgsoppgaveAnalyse */
    forrigeEstimatNok: forrigeEstimat,
    nyttEstimatNok: nyttEstimat.estimertVerdi,
    endringProsent: ((nyttEstimat.estimertVerdi - forrigeEstimat) / forrigeEstimat) * 100,
    signaler,
  }
}
```

**Obs:** Koden ovenfor må reberegne ved å gjenbruke _comps_ fra eksisterende
resultat slik at vi ikke trenger å kalle Kartverket på nytt. Dette krever at
comps er persistert (det er de i dag, på `Estimat.comps`).

### 8.3 Hva frontend gjør når analysen er ferdig

Worker skriver det oppdaterte `AnalyseResultat` tilbake til den samme
`sessionStorage`-nøkkelen, og frontend refresher via `setData(oppdatert)`.

Frontend-endringer:

- Ny `<SalgsoppgaveCta>` komponent som vises hvis `data.salgsoppgave == null`.
- Ved opplasting: mount `<SalgsoppgaveStatus>` med polling.
- Ved ferdig: render `<SalgsoppgaveResultat>` med funn-liste, sitater og
  delta-visning.
- `<Justeringsliste>` vil automatisk vise de nye faktorene så snart vi utvider
  `KATEGORI_REKKEFOLGE`.
- `<Vurderingsnarrativ>` trenger *ingen* endring — faktorene kommer med i samme
  array og narrativen henter topp 3 pos/neg uansett kategori.

## 9. Testing og evaluering

### 9.1 Test-stack

Ingen test-infra i repo i dag. **Valg: Vitest**.

- Rask, Vite-basert, Jest-kompatibel API.
- Fungerer med TS uten ekstra config.
- Snapshot-tester er førsteklasses.

### 9.2 Tre lag

**Enhetstester** (rask, kjøres på hver commit):

- `pricing-rules.test.ts` — gitt signaler → forvent faktorer.
- `signaler/fra-tilstandsrapport.test.ts` — gitt strukturert rapport → forvent
  signaler.
- `splitt.test.ts` — gitt tekst-input → forvent riktige sidegrenser.
- `pii.test.ts` — gitt tekst med personnr/navn → forvent redaksjon.

**Snapshot-tester** (mellomrask, kjøres på demand):

- Fiksturer: 2–3 anonymiserte eksempel-PDF-er committet i `test-fixtures/`.
- Pipeline kjøres mot fiksturene med LLM-kall mockea (innspilt respons).
- Snapshot matches mot forventet `SalgsoppgaveAnalyse`.
- Fanger regresjoner ved refaktor.

**Evalueringssuite** (treg, kjøres periodisk):

- 10–20 reelle vedlegg med fasit skrevet av en takstkyndig.
- Måler per felt:
  - Precision/recall for TG-uttrekk.
  - MAE på felleskostnader/fellesgjeld.
  - Korrelasjon mellom vårt justerte estimat og faktisk salgspris.
- Rapportert i CI som en statusrapport per PR som endrer pipeline.

### 9.3 Hallusinasjonsvern

Kritisk: LLM-uttrekk returnerer ofte tall som "stemmer" men ikke finnes i
kildeteksten. Vernet:

1. Hver ekstrahert verdi må pares med `sitat` + `sideNr`.
2. Post-prosessor sjekker at `sitat` faktisk finnes som substring (med trimming
   og whitespace-normalisering) i tekst på angitt sidenummer.
3. Hvis ikke: retry 1x med eksplisitt feedback ("sitatet ditt fantes ikke på
   side N"). Fortsatt feil → dropp den ekstraksjonen og logg i
   `feilOgMangler`.

## 10. PII, personvern og sikkerhet

### 10.1 Personvern-klassifisering

Vedleggene inneholder:

- Personnumre (selger, kjøper)
- Fulle navn (styreleder, takstmann, beboere)
- Adresser (egen + naboer)
- Bankkontonumre (fellesgjeld)
- Bilder som kan identifisere personer (innvendig bolig)

Dette er **særskilt kategori** under GDPR for noen typer. Vedleggene må
behandles deretter.

### 10.2 PII-redaksjon (D6)

Før tekst sendes til LLM:

- `lib/salgsoppgave/pii.ts` redakterer med regex + navneliste fra uttrekket selv:
  - Fødselsnr (11 siffer med kjent modulus): `[FNR]`
  - Kontonummer (11 siffer m/ spesifikk struktur): `[KONTO]`
  - Tlf (norsk 8-siffer): `[TLF]`
  - E-post: `[E-POST]`
- Navn er vanskeligere. MVP-strategi: behold navn på takstmann/styreleder som
  relevant kontekst, men logg at det sendes. Phase 2: NER-basert redaksjon.

Redaksjon skjer **per side før LLM-kall**. Originalteksten beholdes for
sitat-verifisering lokalt (verifiseringen kjøres mot ikke-redaktert tekst, slik
at selv om LLM returnerer et redaktert sitat kan vi matche det).

### 10.3 Databehandleravtale

Må være på plass med:

- Anthropic (LLM).
- Microsoft Azure (OCR).
- S3-leverandør (AWS eller annen).

Se §12.

### 10.4 Retention

- Rå-PDF i S3: 30 dager etter siste bruk (tentativt, må bekreftes).
- Strukturert uttrekk i DB/Redis: lagres så lenge tilhørende `AnalyseResultat`
  lever.
- Frontend sessionStorage: tømmes ved tab-lukking (som i dag).

### 10.5 Brukersamtykke

Ved opplasting må brukeren samtykke til:

- At dokumentet sendes til en databehandler (LLM-leverandør).
- At vi lagrer det i 30 dager.
- At data kan brukes anonymisert for modellforbedring (opt-in, separat
  checkbox).

## 11. Observability og kostnadskontroll

### 11.1 Loggpunkter

Per job:

- Totaltid + tid per pipeline-steg.
- Antall sider digital vs OCR.
- Antall tokens inn/ut per LLM-kall.
- USD-kostnad per LLM-kall og per OCR-side.
- Konfidens-distribusjon per signal.
- Antall avviste ekstraksjoner (sitat-mismatch).

### 11.2 Kostnadstak

Per analyse skal vi ha harde grenser:

- Maks 2000 OCR-sider (umulig i praksis, men failsafe).
- Maks $3 total kostnad før vi stopper og melder feil.

### 11.3 Alerts

- Feilrate per dokumenttype > 10 % over rullende 24 t.
- Snittid per job > 2 min over rullende 1 t.
- LLM-kostnad per dag > et budsjett-tak.

## 12. Åpne spørsmål (blokkerer kode)

Disse må være besvart før MVP-implementasjon kan starte:

| # | Spørsmål | Hvem bestemmer | Blokkerer |
|---|----------|----------------|-----------|
| Q1 | Har vi/får vi databehandleravtale med Anthropic? Alternativt: hva er backup-leverandør? | Legal + Plattform | D5, D6 |
| Q2 | Azure Document Intelligence eller annen OCR — hvilken Schibsted-instans kan vi bruke, og med hvilken databehandleravtale? | Plattform | D2 |
| Q3 | S3-bucket: egen boligverdi-bucket eller delt Schibsted-infra? Retention-policy bekreftet til 30 dager? | Plattform + Legal | D1 |
| Q4 | Redis-infra: ny eller eksisterende? (Upstash Serverless Redis er en rimelig default hvis ingen eksisterende.) | Plattform | D10, D11 |
| Q5 | LLM-budsjett per analyse og per måned? | Produkt/Finans | D5, §11.2 |
| Q6 | Eksempelvedlegg for eval-suiten: hvor får vi 10–20 reelle (anonymiserte) salgsoppgaver? | Produkt | §9.2 |
| Q7 | PDF-viewer i UI: åpne rå-PDF med sidehopp, eller bygge egen viewer med highlight? | Produkt + Design | §4.2 (bbox lagring), §5.2 |
| Q8 | Samtykketekst — hvem skriver den, og er det ett samtykke eller granular opt-ins? | Legal + Produkt | §10.5 |

Før disse er besvart kan vi forberede skjelettet (§13 milepæl 1-2) men ikke
begynne ende-til-ende-flyten.

## 13. Milepæler

Rekkefølge er forsøkt slik at hver milepæl er self-contained og kan gi feedback
før neste starter.

1. **DESIGN godkjent.** Dette dokumentet merget, Q1–Q8 besvart (eller eksplisitt
   utsatt).
2. **Skjelett.** `lib/salgsoppgave/`-modul opprettet med tomme funksjoner og
   alle typer + Zod-schemas. Utvidelse av `Justeringskategori`. Test-stack
   satt opp (Vitest).
3. **Upload + job-kø.** Route handlers + Redis-state + polling. Ingen reell
   analyse — worker returnerer mock `SalgsoppgaveAnalyse`. Frontend har
   CTA, status og resultat-panel. **Denne milepælen gir oss demonstrerbar
   UX.**
4. **PDF-preprosessering.** `pdf.ts` + `ocr.ts` + `splitt.ts`. Snapshot-test
   mot én anonymisert PDF.
5. **Klassifisering + tilstandsrapport-uttrekk.** Schema, LLM-integrasjon, PII,
   sitat-verifisering. Signaler fra tilstandsrapport.
6. **Forretningsfører-uttrekk + regelmotor.** Andre schema, signaler, vekter.
   Integrasjon mot `beregnEstimat` med ny `salgsoppgaveSignaler`-input.
7. **Full ende-til-ende.** Mock byttes ut med ekte pipeline. Observability på
   plass.
8. **Eval-suite.** 10–20 vedlegg kjørt, presisjon/recall målt, vekter
   kalibrert.
9. **Shipped MVP.** Bak feature-flagg for intern bruk først.

Estimert tid: ~4-6 utviklerdager for milepæl 2-3, deretter 2-4 dager per
milepæl 4-7. Eval (8) er parallell med 6-7. Totalt 15-25 utviklerdager til
shipped MVP.

---

*Relatert:*
[salgsoppgave-analyse.md](./salgsoppgave-analyse.md) (brief).
