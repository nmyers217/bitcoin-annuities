import { type Annuity } from './types'

export function serializeAnnuities(annuities: Annuity[]): string {
  return btoa(JSON.stringify(annuities))
}

export function deserializeAnnuities(param: string): Annuity[] {
  try {
    return JSON.parse(atob(param))
  } catch (e) {
    console.error('Failed to parse annuities from URL:', e)
    return []
  }
}
