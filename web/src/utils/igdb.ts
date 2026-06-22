interface IgdbSearchResult {
  id: number
  name: string
  slug: string
  first_release_date?: number
  summary?: string
  cover?: { id: number; image_id: string; url: string }
  artworks?: { id: number; image_id: string; url: string }[]
  videos?: { id: number; video_id: string; name: string }[]
  logos?: { id: number; image_id: string; url: string }[]
  platforms?: { id: number; name: string; abbreviation?: string }[]
  screenshots?: { id: number; image_id: string; url: string }[]
}

const TOKEN_KEY = 'igdb_access_token'
const TOKEN_EXPIRY_KEY = 'igdb_token_expiry'

function igdbConfigured(): boolean {
  return !!(import.meta.env.VITE_IGDB_CLIENT_ID && import.meta.env.VITE_IGDB_CLIENT_SECRET)
}

async function getAccessToken(): Promise<string> {
  const saved = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (saved && expiry && Date.now() < Number(expiry)) return saved

  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const clientSecret = import.meta.env.VITE_IGDB_CLIENT_SECRET!
  const resp = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: 'POST' })
  if (!resp.ok) throw new Error('Failed to get IGDB token')
  const data = await resp.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (data.expires_in - 60) * 1000))
  return data.access_token
}

export async function searchIgdbGames(query: string): Promise<IgdbSearchResult[]> {
  if (!igdbConfigured()) return []
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()

  const escaped = query.replace(/'/g, "''").replace(/"/g, '')
  const body = `fields name,slug,first_release_date,summary,cover.image_id,platforms.name,platforms.abbreviation,screenshots.image_id; where name ~ *"${escaped}"*; limit 8;`
  const resp = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!resp.ok) throw new Error(`IGDB search failed: ${resp.status}`)
  return resp.json()
}

export async function fetchIgdbGameById(igdbId: number): Promise<IgdbSearchResult | null> {
  if (!igdbConfigured()) return null
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()
  const body = `fields name,slug,first_release_date,summary,cover.image_id,platforms.name,platforms.abbreviation,screenshots.image_id; where id = ${igdbId}; limit 1;`
  const resp = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!resp.ok) throw new Error(`IGDB fetch failed: ${resp.status}`)
  const data = await resp.json()
  return data?.[0] || null
}

export async function fetchIgdbArtworks(gameId: number): Promise<{ image_id: string }[]> {
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()
  const resp = await fetch('/api/igdb/artworks', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields image_id; where game = ${gameId}; limit 50;`,
  })
  if (!resp.ok) return []
  return resp.json()
}

export async function fetchIgdbVideos(gameId: number): Promise<{ video_id: string; name?: string }[]> {
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()
  const resp = await fetch('/api/igdb/game_videos', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields video_id,name; where game = ${gameId}; limit 50;`,
  })
  if (!resp.ok) return []
  return resp.json()
}

export async function fetchIgdbLogos(gameId: number): Promise<{ image_id: string }[]> {
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()
  const resp = await fetch('/api/igdb/game_logos', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields image_id; where game = ${gameId}; limit 50;`,
  })
  if (!resp.ok) return []
  return resp.json()
}

export async function fetchIgdbCovers(gameId: number): Promise<{ image_id: string }[]> {
  const clientId = import.meta.env.VITE_IGDB_CLIENT_ID!
  const token = await getAccessToken()
  const resp = await fetch('/api/igdb/covers', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields image_id; where game = ${gameId}; limit 50;`,
  })
  if (!resp.ok) return []
  return resp.json()
}

export function igdbImageUrl(imageId: string, size: string = 'cover_big'): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
}

export function ytThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
