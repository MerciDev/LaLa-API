const SGDB_BASE = '/api/sgdb'

interface SgdbSearchResult {
  id: number
  name: string
  types: string[]
}

interface SgdbAsset {
  id: number
  url: string
  thumb: string
  width: number
  height: number
  style?: string
  mime?: string
}

function sgdbConfigured(): boolean {
  return !!import.meta.env.VITE_STEAMGRIDDB_API_KEY
}

function sgdbHeaders(): Record<string, string> {
  return { Accept: 'application/json' }
}

export async function searchSgdbGames(term: string): Promise<SgdbSearchResult[]> {
  if (!sgdbConfigured()) return []
  try {
    const resp = await fetch(`${SGDB_BASE}/search/autocomplete/${encodeURIComponent(term)}`, {
      headers: sgdbHeaders(),
    })
    if (!resp.ok) return []
    const json = await resp.json()
    return json.data || []
  } catch {
    return []
  }
}

export async function fetchSgdbGrids(gameId: number): Promise<SgdbAsset[]> {
  try {
    const resp = await fetch(`${SGDB_BASE}/grids/game/${gameId}`, { headers: sgdbHeaders() })
    if (!resp.ok) return []
    const json = await resp.json()
    return json.data || []
  } catch {
    return []
  }
}

export async function fetchSgdbHeroes(gameId: number): Promise<SgdbAsset[]> {
  try {
    const resp = await fetch(`${SGDB_BASE}/heroes/game/${gameId}`, { headers: sgdbHeaders() })
    if (!resp.ok) return []
    const json = await resp.json()
    return json.data || []
  } catch {
    return []
  }
}

export async function fetchSgdbLogos(gameId: number): Promise<SgdbAsset[]> {
  try {
    const resp = await fetch(`${SGDB_BASE}/logos/game/${gameId}`, { headers: sgdbHeaders() })
    if (!resp.ok) return []
    const json = await resp.json()
    return json.data || []
  } catch {
    return []
  }
}

export async function fetchSgdbIcons(gameId: number): Promise<SgdbAsset[]> {
  try {
    const resp = await fetch(`${SGDB_BASE}/icons/game/${gameId}`, { headers: sgdbHeaders() })
    if (!resp.ok) return []
    const json = await resp.json()
    return json.data || []
  } catch {
    return []
  }
}
