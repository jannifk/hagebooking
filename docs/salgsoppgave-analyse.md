# Feature: AI-drevet vedleggsanalyse for justering av prisvurdering

> **Status:** North star / product brief. Ikke implementert.
>
> **Neste dokument:** [`DESIGN-salgsoppgave.md`](./DESIGN-salgsoppgave.md) — tar
> arkitekturbeslutningene denne briefen krever.

## Kontekst

Vi bygger en app som gjør prisvurderinger av boliger (norsk marked). I dag baseres
vurderingen primært på strukturerte data (adresse, areal, byggeår, tidligere salg i
området, osv.). Vi vil nå la brukeren laste opp vedleggene som følger en
boligannonse — typisk én samlet PDF på 50–100 sider — og bruke innholdet til å
justere prisvurderingen opp eller ned.

## Målet med featuren

Brukeren laster opp én eller flere PDF-filer. Systemet skal:

1. Parse og strukturere innholdet.
2. Identifisere dokumenttyper (se liste under).
3. Trekke ut prisrelevante signaler.
4. Kjøre signalene gjennom en justeringsmodell som modifiserer den eksisterende
   prisvurderingen.
5. Vise brukeren en forklarbar oversikt: "Vurderingen ble justert med X kr fordi …"
   — alltid med kilde-sitat fra dokumentet og sidetall.

**Forklarbarhet er et hovedkrav.** En bruker må kunne klikke seg fra en justering
ned til den konkrete setningen/seksjonen i PDF-en.

## Hva et typisk vedlegg inneholder

Basert på et reelt eksempel (88 sider, ~9,8 MB) — et typisk
"Vedlegg sammenslått"-dokument kombinerer flere underdokumenter i ett PDF:

- **Tilstandsrapport** (takstingeniør, NS 3600) — viktigste kilden. Beskriver
  bygningsdeler med tilstandsgrader:
  - TG0 (ingen avvik), TG1 (mindre avvik), TG2 (vesentlige avvik / tiltak i nær
    fremtid), TG3 (store/alvorlige avvik, strakstiltak), TG IU (ikke undersøkt).
  - For TG3 angis ofte utbedringskostnad i intervaller: under 20k, 20–100k,
    100–200k, 200–500k, over 500k.
  - Inneholder årstall for renovering av bad, kjøkken, tak, rør, elektrisk
    anlegg.
  - HMS-forhold (f.eks. rekkverkshøyde, radon, brannvarsling).
- **Egenerklæring fra selger**.
- **Meglers verdivurdering**.
- **Informasjon fra forretningsfører** — månedlige felleskostnader, andel
  fellesgjeld, total gjeld i sameiet, formue, forsikring, antall enheter,
  planlagte gebyrer.
- **Nabolagsprofil**.
- **Reguleringskart og -bestemmelser** — tillatt bruk, byggehøyder,
  nabobyggesaker.
- **Energiattest** — energikarakter (A–G).
- **Løsøre- og tilbehørsliste**.
- **Budskjema**.
- **Årsberetning + årsregnskap for sameiet/borettslaget** — vedlikeholdshistorikk,
  planlagt vedlikehold, økonomisk sunnhet, pågående rehabiliteringsprosjekter.
- **Protokoll/innkalling til årsmøte** — kommende vedtak som påvirker kostnader
  (vannmålere, fasadeoppussing, lån).
- **Lånedetaljer for fellesgjeld** — rentesats, nedbetalingsplan,
  innfrielsesdato.
- **Ferdigattester og byggesaksdokumenter** fra kommunen.
- **Søknad om reseksjonering / målebrev / tinglyste dokumenter**.
- **Branninstruks, vedtekter, husordensregler**.

Dokumentene er heterogene: skannet tekst, digitale PDF-er, håndskrevne signaturer,
tabeller (særlig i regnskap og låneplan), bilder med bildetekst i tilstandsrapporten.

## Prisrelevante signaler

*Ikke uttømmende.*

**Negative signaler (trekker prisen ned):**

- Antall TG2- og TG3-avvik og estimert sum utbedringskostnader.
- Gammelt bad eller kjøkken uten renovering (> 20–25 år).
- Gammelt elektrisk anlegg (> 20 år uten samsvarserklæring etter 1999).
- Gamle soilrør / vannrør som ikke er byttet.
- Høy andel fellesgjeld og høye felleskostnader.
- Planlagt stor rehabilitering som sameiet ikke har fondsdekning for.
- HMS-avvik (lave rekkverk, manglende brannsikring).
- Ulovlige bruksendringer / manglende ferdigattest.
- Dårlig energikarakter (F/G).
- Naturlig (ikke balansert) ventilasjon i nyere bygg der det forventes balansert.
- Pågående byggesak på nabotomt som påvirker utsikt/sol.

**Positive signaler (trekker prisen opp):**

- Nylig totalrenovert bad/kjøkken (med samsvarserklæring og fagutført).
- Nytt tak, nye rør, nytt elektrisk.
- Installert varmepumpe, lekkasjestopper, komfyrvakt.
- Vedlikeholdsplan og god økonomi i sameiet.
- Lav fellesgjeld, lave felleskostnader.
- God energikarakter (A/B).
- Godkjente tegninger, ryddig lovlighet.
- Takterrasse/balkong med rehabilitert membran.

**Nøytrale/kontekstuelle signaler (trengs for vekting):**

- Byggeår, totalareal (BRA, BRA-i, TBA, ALH).
- Antall soverom (utledes fra plantegninger/romfordeling).
- Etasje, heis/ikke heis.
- Dokumenterte årstall for oppgradering per komponent.

## Foreslått arkitektur

*Skisse — skal diskuteres og besluttes i DESIGN.md før implementasjon.*

Pipeline:

1. **Upload-endepunkt** som tar imot én eller flere filer (PDF primært, men design
   for utvidelse til bilder/DOCX). Lagre rått + versjonert i objektstore. Sett en
   unik `assessment_id` og en `attachment_id` per fil.
2. **Preprocessing:**
   - OCR (f.eks. Tesseract eller cloud OCR) for skannede sider, skip for digitale
     PDF-er.
   - Sidelevel-tekst + koordinater bevares så vi kan lenke tilbake til original.
   - Splitt "samlet PDF" i underdokumenter ved å oppdage seksjonsskifter
     (overskrifter, topp/bunntekst, metadata-endringer).
3. **Klassifisering av dokumenttype** per underdokument — liten classifier eller
   LLM-call med few-shot.
4. **Strukturert uttrekk per dokumenttype.** Bruk LLM med typede JSON-schemas
   (Pydantic/Zod). Hver schema skal matche dokumenttypen — tilstandsrapport har
   felter for TG-vurderinger per rom, regnskap har inntekt/utgift/gjeld osv.
   Lagre alle sitater og sidereferanser.
5. **Signalberegning** — deterministisk kode som tar strukturerte data og
   produserer en liste med
   `PricingSignal { type, direction, magnitude_estimate, confidence, source_citation }`.
6. **Justeringsmodell** — tar eksisterende prisvurdering + signalliste og
   produserer ny vurdering + forklaring. **Første versjon er regelbasert med
   eksplisitte vekter** (lett å revidere); senere ML.
7. **Presentasjon** — UI som viser brukeren: gammel vurdering, ny vurdering, topp 10
   signaler sortert på påvirkning, og "Vis kilde"-knapp som scroller til sidetall
   i PDF-en.

## Integrasjonspunkt mot eksisterende kodebase

*Tillegg til den opprinnelige briefen.*

Vi har allerede en prisvurderingsmodell i `lib/estimering.ts`:

- `beregnEstimat({ finnAnnonse, eiendom, comps, berikelser })` er synkron,
  in-process, og returnerer et `Estimat` med en `justeringsfaktorer:
  Justeringsfaktor[]`-liste.
- Hver `Justeringsfaktor` har `{ navn, beskrivelse, justeringsProsent, brukt,
  kategori, kilde }`.

**Salgsoppgave-signaler skal produseres inn i denne kontrakten**, ikke inn i en
parallell modell. Det betyr:

- Signalberegning (punkt 5 over) produserer et array med
  `PricingSignal`-objekter internt, som deretter mappes til
  `Justeringsfaktor`-objekter før de sendes inn i `beregnEstimat` som en ny
  `salgsoppgaveSignaler`-input.
- `kilde` på faktoren bærer sidetall og sitat-nøkkel, f.eks.
  `"Salgsoppgave · s. 41 · sitat-id sig_7a3f"`.
- Frontend (`Justeringsliste`, `Vurderingsnarrativ`) trenger ingen endringer i
  kontrakt — bare en ny `kategori`-verdi (se under).

## Utvidelse av `Justeringskategori`

*Tillegg til den opprinnelige briefen.*

Dagens enum: `'bolig' | 'transport' | 'miljo' | 'skole'`.

Med salgsoppgave-signaler bør den utvides, ellers havner alt under "bolig" og
`Justeringsliste`-grupperingen blir ulesbar:

```ts
export type Justeringskategori =
  | 'bolig'              // fra Finn/Matrikkel (som i dag)
  | 'transport'          // Entur (som i dag)
  | 'miljo'              // støy/luft/grønt (som i dag)
  | 'skole'              // skolekrets (som i dag)
  | 'tilstand'           // TG-avvik, gamle rør/el, HMS, bad/kjøkken-slitasje
  | 'fellesskapsokonomi' // fellesgjeld, felleskost, vedlikeholdsplan, fondsdekning
  | 'energi'             // energikarakter, ventilasjon, varmepumpe
  | 'lovlighet'          // ferdigattest, reseksjonering, bruksendring, regulering
```

De fire nye kategoriene er kun aktuelle for signaler som kommer fra
salgsoppgave-pipelinen. `KATEGORI_REKKEFOLGE` i `Justeringsliste.tsx` må utvides
tilsvarende.

## Krav til første iterasjon (MVP)

- Støtt kun PDF-opplastning.
- Støtt kun **tilstandsrapport** og **informasjon fra forretningsfører** som
  dokumenttyper. Disse to gir det meste av prisutslaget.
- Uttrekk:
  - Alle TG2/TG3-avvik med beskrivelse, rom, tiltak, kostnadsintervall,
    sidereferanse.
  - Felleskostnader, andel fellesgjeld, total fellesgjeld, rentesats,
    innfrielsesdato.
- Justeringsmodellen er regelbasert og konfigurerbar i én fil
  (`lib/salgsoppgave/pricing-rules.ts` eller tilsvarende). Start enkelt — f.eks.
  kostnadsintervaller trekkes fra estimert verdi; fellesgjeld legges til som
  implisitt gjeld.
- UI: én skjerm som viser justering + kilde (utvidelse av eksisterende
  resultatside, ikke ny side).

## Utenfor MVP (men designet inn fra start)

- Flere dokumenttyper.
- Sammenligning mot område-/arkitekturtypisk tilstand ("Dette badet er 11 år
  gammelt — medianen i området er 8 år").
- Fotoanalyse (tegn på fukt, slitasje) fra tilstandsrapportens bilder.
- Versjonering: bruker kan laste opp nytt vedlegg og se endring i vurdering.
- Brukerjustering: bruker kan overstyre et signal ("Dette er allerede utbedret")
  og få ny vurdering.

## Viktige hensyn

- **Språk:** alle dokumenter er på norsk. Sørg for at LLM-prompts og embeddinger
  håndterer bokmål/nynorsk og fagterminologi (tilstandsgrad, fellesgjeld,
  branncelle, soilrør osv.).
- **Personvern:** vedleggene inneholder personnumre, navn, adresser, kontonumre.
  Bygg i PII-redaksjon før data sendes til eksterne LLM-er, eller bruk leverandør
  med databehandleravtale. Følg GDPR.
- **Hallusinasjon:** uttrekk må aldri returnere tall som ikke finnes i
  kildeteksten. Alle ekstraherte verdier må pares med sitat og sidetall, og en
  valideringsfase må avvise ekstraksjoner der sitatet ikke matcher verdien.
- **Observability:** logg konfidens per ekstraksjon. Bygg en evalueringssuite med
  10–20 vedlegg der vi har fasit, og mål presisjon/recall per felt.
- **Edge cases:** manglende tilstandsrapport, rapport utløpt (> 1 år gammel),
  uleselig skanning, innrammet tekst, selvbygde dokumenter uten standard layout.

## Leveranse

1. Lag en **`DESIGN.md`** som beskriver arkitekturvalg og trade-offs (særlig:
   hvilken LLM-strategi, hvordan man splitter samlet PDF, hvor regelmotoren
   lever). Denne må besvare integrasjonspunktet mot `lib/estimering.ts`
   konkret.
2. Sett opp prosjektstruktur (ny `lib/salgsoppgave/`-modul, hvordan
   uttrekksjemaer versjoneres).
3. Implementer MVP-flyten ende-til-ende med ett eksempelvedlegg.
4. Skriv tester: a) enhetstester for regelmotor, b) snapshot-test mot
   eksempelvedlegget som verifiserer utdrag + justert pris.

## Oppklaringer før kode

Før implementasjon begynner, må disse være avklart:

- **LLM-budsjett og -leverandør** — har vi databehandleravtale med OpenAI/Anthropic,
  eller skal vi bruke selvhostet modell? Hvor mye tåler en analyse i kost?
- **Hosting** — hvor lagres råvedleggene? Vi må ha objektstore med kryptering og
  retention-policy som håndterer PII.
- **Eksempelvedlegg** — trenger 10–20 reelle salgsoppgaver (anonymisert eller med
  samtykke) som fasit for evalueringssuiten.
- **PDF-visning i UI** — skal "Vis kilde" åpne original-PDF-en med sidehopp, eller
  en egen viewer med highlight? Det siste krever at vi lagrer tekst-koordinater,
  ikke bare sidetall.
