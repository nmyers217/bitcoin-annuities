import type { Metadata } from 'next'

import { deserializeAnnuities } from '@/lib/url-state'
import { TrackerPage } from './tracker-page'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ annuities?: string }>
}): Promise<Metadata> {
  const awaitedParams = await searchParams
  const annuitiesParam = awaitedParams.annuities

  if (annuitiesParam) {
    const annuities = deserializeAnnuities(annuitiesParam)

    const title = `My Annuity Portfolio`
    const description = `Check out my annuity portfolio of ${annuities.length.toLocaleString()} annuities`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [`/api/og?annuities=${annuitiesParam}`],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`/api/og?annuities=${annuitiesParam}`],
      },
    }
  }

  return {}
}
export default TrackerPage
