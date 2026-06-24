// Eiendomsdata fra Matrikkelen
export interface MatrikkelEiendom {
  adresse: string
  postnummer: string
  poststed: string
  gnr: number
  bnr: number
  bra: number | null       // Bruksareal m²
  byggeaar: number | null
  boligtype: 'leilighet' | 'enebolig' | 'rekkehus' | 'ukjent'
  koordinater: {
    lat: number
    lng: number
  } | null
}

// Data hentet fra Finn-annonsen
export interface FinnAnnonse {
  finnkode: string
  tittel: string
  adresse: string
  prisantydning: number
  fellesgjeld: number
  felleskostnader: number | null
  bra: number | null
  etasje: number | null
  antallEtasjer: number | null
  balkong: boolean
  solforhold: 'god' | 'middels' | 'liten' | 'ukjent'
  oppussingsaar: number | null
  tomteareal: number | null          // m²
  tomteEiet: boolean                 // true = eiet, false = festet/felles
  boligtype: string
  megler: string | null
  bildeurls: string[]
}

// Et sammenlignbart salg (comp)
export interface SammenlignbartSalg {
  adresse: string
  postnummer: string
  salgsdato: string        // ISO date string
  salgspris: number
  bra: number
  prisPerKvm: number
  boligtype?: 'leilighet' | 'enebolig' | 'rekkehus' | 'ukjent'
  koordinater: {
    lat: number
    lng: number
  } | null
  // Fylles ut av comp-utvalg-modulen — viser hvorfor denne comp-en er valgt.
  avstandMeter?: number | null
  score?: number            // 0–1, veiet relevans
  scoreKomponenter?: {
    avstand: number
    boligtype: number
    areal: number
    ferskhet: number
  }
}

// Justeringsfaktorer brukt i estimeringsmodellen
export type Justeringskategori =
  | 'bolig'      // etasje, balkong, sol, oppussing, byggeår, fellesgjeld
  | 'transport'  // kollektiv-nærhet
  | 'miljo'      // støy, luftkvalitet, grønt
  | 'skole'      // skolekrets, skoleavstand

export interface Justeringsfaktor {
  navn: string
  beskrivelse: string
  justeringsProsent: number  // f.eks. 3 = +3%, -2 = -2%
  brukt: boolean
  kategori?: Justeringskategori
  kilde?: string             // f.eks. "Entur", "PVGIS" — for transparens
}

// Det endelige estimeringsresultatet
export interface Estimat {
  estimertVerdi: number
  nedreGrense: number       // estimat - 8%
  ovreGrense: number        // estimat + 8%
  basisPrisPerKvm: number
  antallComps: number
  konfidens: 'svak' | 'middels' | 'sterk'
  justeringsfaktorer: Justeringsfaktor[]
  comps: SammenlignbartSalg[]
}

// Komplett analyse-resultat som returneres til frontend
export interface AnalyseResultat {
  id: string
  opprettet: string
  finnAnnonse: FinnAnnonse | null
  eiendom: MatrikkelEiendom
  estimat: Estimat
}

// Input til analyze-endepunktet
export interface AnalyzeInput {
  finnUrl?: string
  adresse?: string
}
