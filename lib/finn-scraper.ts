import * as cheerio from 'cheerio'
import { FinnAnnonse } from '@/types'

export async function scrapeFinnAnnonse(url: string): Promise<FinnAnnonse> {
  // Valider at URL er en gyldig Finn-boligannonse
  const finnUrlPattern = /finn\.no\/realestate\/(homes\/ad|lettings\/ad)\.html\?finnkode=(\d+)/
  const match = url.match(finnUrlPattern) || url.match(/finnkode=(\d+)/)
  if (!match) {
    throw new Error('Ugyldig Finn-URL. Forventet format: https://www.finn.no/realestate/homes/ad.html?finnkode=XXXXXXX')
  }

  const finnkode = match[match.length - 1]

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'nb-NO,nb;q=0.9',
    },
    next: { revalidate: 3600 }, // Cache i 1 time
  })

  if (!response.ok) {
    throw new Error(`Klarte ikke hente Finn-annonsen (HTTP ${response.status}). Sjekk at URL-en er riktig og at annonsen fortsatt er aktiv.`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  // Hent JSON-LD structured data (mest pålitelig kilde)
  let strukturertData: Record<string, unknown> = {}
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text())
      if (parsed['@type'] === 'Product' || parsed['@type'] === 'RealEstateListing') {
        strukturertData = parsed
      }
    } catch {
      // Ignorer parse-feil
    }
  })

  // Hent Next.js __NEXT_DATA__ (Finn bruker Next.js internt)
  let nextData: Record<string, unknown> = {}
  const nextDataScript = $('#__NEXT_DATA__').text()
  if (nextDataScript) {
    try {
      nextData = JSON.parse(nextDataScript)
    } catch {
      // Ignorer
    }
  }

  // Helper: hent verdi fra nested path i nextData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFromNextData = (path: string[]): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = nextData
    for (const key of path) {
      if (current == null) return null
      current = current[key]
    }
    return current
  }

  // Prisantydning
  const prisantydningText = $('[data-testid="pricing-incl-collective-debt"] .u-t3').first().text()
    || $('span:contains("Prisantydning")').next().text()
    || getFromNextData(['props', 'pageProps', 'ad', 'price', 'suggestion', 'value'])

  const prisantydning = typeof prisantydningText === 'number'
    ? prisantydningText
    : parseInt(String(prisantydningText).replace(/\s/g, '').replace(/[^\d]/g, '')) || 0

  // Fellesgjeld
  const fellesgjeldText = $('[data-testid="collective-debt"]').text()
    || $('dt:contains("Fellesgjeld")').next('dd').text()
  const fellesgjeld = parseInt(String(fellesgjeldText).replace(/\s/g, '').replace(/[^\d]/g, '')) || 0

  // Felleskostnader
  const felleskostnaderText = $('dt:contains("Felleskost/mnd")').next('dd').text()
    || $('dt:contains("Felleskostnader")').next('dd').text()
  const felleskostnader = parseInt(String(felleskostnaderText).replace(/\s/g, '').replace(/[^\d]/g, '')) || null

  // BRA (bruksareal) — Finn bruker forskjellige DOM-strukturer per annonse.
  // Foretrekk "Bruksareal" over "Internt bruksareal" (litt større tall) og
  // "Primærrom". Fall tilbake på regex mot fritekst-beskrivelsen.
  const parseKvm = (s: string | undefined): number | null => {
    if (!s) return null
    const m = String(s).match(/(\d{1,4})\s*(?:m²|kvm|m2)/i)
    return m ? parseInt(m[1], 10) : null
  }
  let bra: number | null =
    parseKvm($('dt:contains("Bruksareal")').not(':contains("Internt")').first().next('dd').text()) ||
    parseKvm($('dt:contains("Internt bruksareal")').first().next('dd').text()) ||
    parseKvm($('dt:contains("Primærrom")').first().next('dd').text()) ||
    parseKvm($('dt:contains("BRA")').first().next('dd').text()) ||
    parseKvm($('[data-testid="key-info-area"]').text())
  if (!bra) {
    const helsideTekst = $('body').text().replace(/\s+/g, ' ')
    const braMatch =
      helsideTekst.match(/Totalt bruksareal BRA:\s*(\d+)\s*(?:kvm|m²)/i) ||
      helsideTekst.match(/\bBRA[- ]?i?:?[^\d]{0,10}(\d+)\s*(?:kvm|m²)/i) ||
      helsideTekst.match(/Bruksareal[^\d]{0,10}(\d+)\s*(?:kvm|m²)/i)
    if (braMatch) bra = parseInt(braMatch[1], 10)
  }

  // Etasje
  const etasjeText = $('dt:contains("Etasje")').next('dd').text()
  const etasjeMatch = String(etasjeText).match(/(\d+)/)
  const etasje = etasjeMatch ? parseInt(etasjeMatch[1]) : null

  // Balkong
  const beskrivelseText = $('[data-testid="ad-description"]').text().toLowerCase()
    || $('section.ads__unit__content').text().toLowerCase()
  const balkong = beskrivelseText.includes('balkong') || beskrivelseText.includes('terrasse')

  // Solforhold (enkel heuristikk fra beskrivelse)
  let solforhold: FinnAnnonse['solforhold'] = 'ukjent'
  if (beskrivelseText.includes('sydvendt') || beskrivelseText.includes('sørvendt') || beskrivelseText.includes('vestvendt')) {
    solforhold = 'god'
  } else if (beskrivelseText.includes('nordvendt')) {
    solforhold = 'liten'
  } else if (beskrivelseText.includes('østvendt')) {
    solforhold = 'middels'
  }

  // Adresse — Finn har flyttet dette til aria-label på kart-knappen
  const mapLinkLabel = $('[data-testid="map-link"]').attr('aria-label') ?? ''
  const mapLinkAdresse = mapLinkLabel.replace(/^\s*Åpne kart for\s+/i, '').trim()
  const adresse = mapLinkAdresse
    || $('h1[data-testid="ad-title"]').text().trim()
    || $('h1.u-t2').text().trim()
    || String(strukturertData?.name || '')

  // Tomteareal (hage/uteareal) — f.eks. "533 m² (eiet)" eller "1 200 kvm (festet)"
  const tomtDd = $('dt:contains("Tomteareal")').first().next('dd').text()
  const tomtMatch = tomtDd.match(/([\d\s]+)\s*(?:m²|kvm|m2)/i)
  const tomteareal: number | null = tomtMatch
    ? parseInt(tomtMatch[1].replace(/\s/g, ''), 10) || null
    : null
  const tomteEiet = /eiet/i.test(tomtDd) && !/festet/i.test(tomtDd) && !/fellesareal/i.test(tomtDd)

  // Megler
  const megler = $('[data-testid="broker-name"]').text().trim()
    || $('span.agent__name').text().trim()
    || null

  // Bilder
  const bildeurls: string[] = []
  $('img[src*="images.finncdn.no"]').each((_, el) => {
    const src = $(el).attr('src')
    if (src && !bildeurls.includes(src)) bildeurls.push(src)
  })

  // Tittel
  const tittel = $('h1').first().text().trim() || `Finn-annonse ${finnkode}`

  return {
    finnkode,
    tittel,
    adresse,
    prisantydning,
    fellesgjeld,
    felleskostnader,
    bra,
    etasje,
    antallEtasjer: null, // Vanskelig å parse pålitelig
    balkong,
    solforhold,
    oppussingsaar: null, // Krever NLP på beskrivelse — fremtidig funksjon
    boligtype: 'leilighet',
    megler,
    bildeurls: bildeurls.slice(0, 5),
    tomteareal,
    tomteEiet,
  }
}
