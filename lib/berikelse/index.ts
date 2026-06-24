import { Justeringsfaktor } from '@/types'
import { Koordinater } from './types'
import { hentEnturJustering } from './entur'
import { hentPvgisJustering } from './pvgis'
import { hentStoyJustering } from './stoy'
import { hentSkoleJustering } from './skole'
import { hentLuftJustering } from './luft'
import { hentGrontJustering } from './gront'

export async function hentAlleBerikelser(k: Koordinater | null): Promise<Justeringsfaktor[]> {
  if (!k) return []

  const resultater = await Promise.allSettled([
    hentEnturJustering(k),
    hentPvgisJustering(k),
    hentStoyJustering(k),
    hentSkoleJustering(k),
    hentLuftJustering(k),
    hentGrontJustering(k),
  ])

  return resultater
    .filter((r): r is PromiseFulfilledResult<Justeringsfaktor> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
}
