import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _sb: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_sb) return _sb
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  _sb = createClient(url, key)
  return _sb
}

export interface Asset {
  id: string
  game_id: string
  type: string
  storage_path: string
  original_url?: string
  igdb_image_id?: string
  width?: number
  height?: number
  file_size?: number
  sort_order: number
  label?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export const ASSET_TYPES = [
  { key: 'home', label: 'Home (Cuadrada)', icon: '🔲', single: true },
  { key: 'v_grid', label: 'Vertical Grid', icon: '📱', single: true },
  { key: 'h_grid', label: 'Horizontal Grid', icon: '🖥️', single: true },
  { key: 'logo', label: 'Logos', icon: '🏷️', single: true },
  { key: 'icon', label: 'Iconos', icon: '🔵', single: true },
  { key: 'screenshot', label: 'Capturas', icon: '📷', single: false },
  { key: 'video', label: 'Videos', icon: '🎬', single: false },
] as const

export type AssetType = typeof ASSET_TYPES[number]['key']

export async function getGameAssets(gameId: string, type?: string): Promise<Asset[]> {
  const sb = getSupabaseClient()
  let query = sb.from('assets').select('*').eq('game_id', gameId).order('sort_order').order('created_at')
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getAllAssets(type?: string): Promise<Asset[]> {
  const sb = getSupabaseClient()
  let query = sb.from('assets').select('*, games!inner(name)').order('created_at', { ascending: false })
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getAsset(assetId: string): Promise<Asset | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb.from('assets').select('*').eq('id', assetId).maybeSingle()
  if (error) throw error
  return data
}

export async function createAsset(params: {
  gameId: string
  type: string
  file: File | Blob
  label?: string
  igdbImageId?: string
  originalUrl?: string
  sortOrder?: number
  tags?: string[]
}): Promise<Asset> {
  const sb = getSupabaseClient()
  const safeId = params.gameId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const letter = safeId.charAt(0) || '0'
  const timestamp = Date.now()
  const ext = params.file.type === 'video/mp4' ? 'mp4' : 'webp'
  const storagePath = `${letter}/${safeId}/${params.type}/${timestamp}.${ext}`

  const { error: uploadError } = await sb.storage
    .from('game-images')
    .upload(storagePath, params.file, { contentType: params.file.type, upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = sb.storage.from('game-images').getPublicUrl(storagePath)

  const record = {
    game_id: params.gameId,
    type: params.type,
    storage_path: storagePath,
    original_url: params.originalUrl || publicUrl,
    igdb_image_id: params.igdbImageId,
    sort_order: params.sortOrder ?? 0,
    label: params.label || '',
    tags: params.tags || [],
  }

  const { data, error } = await sb.from('assets').insert(record).select().single()
  if (error) throw error
  return data
}

export async function deleteAsset(assetId: string): Promise<void> {
  const sb = getSupabaseClient()
  const asset = await getAsset(assetId)
  if (!asset) return

  await sb.storage.from('game-images').remove([asset.storage_path])
  const { error } = await sb.from('assets').delete().eq('id', assetId)
  if (error) throw error
}

export async function importGameAssetsFromIgdb(
  gameId: string,
  igdbResult: any,
  onProgress?: (msg: string) => void
): Promise<{ cover?: Asset; screenshots: Asset[] }> {
  const result: { cover?: Asset; screenshots: Asset[] } = { screenshots: [] }

  const blobFromUrl = async (url: string): Promise<Blob> => {
    const resp = await fetch(url)
    return resp.blob()
  }

  if (igdbResult.cover?.image_id) {
    onProgress?.('Descargando portada...')
    const url = igdbImageUrl(igdbResult.cover.image_id, 'cover_big')
    try {
      const blob = await blobFromUrl(url)
      result.cover = await createAsset({
        gameId,
        type: 'cover',
        file: blob,
        igdbImageId: igdbResult.cover.image_id,
        originalUrl: url,
        sortOrder: 0,
        label: 'Portada (IGDB)',
        tags: ['igdb', 'cover'],
      })
      onProgress?.('Portada lista')
    } catch { onProgress?.('Error con portada') }
  }

  if (igdbResult.screenshots?.length) {
    for (let i = 0; i < igdbResult.screenshots.length; i++) {
      const s = igdbResult.screenshots[i]
      onProgress?.(`Descargando captura ${i + 1}/${igdbResult.screenshots.length}...`)
      const url = igdbImageUrl(s.image_id, 'screenshot_huge')
      try {
        const blob = await blobFromUrl(url)
        const asset = await createAsset({
          gameId,
          type: 'screenshot',
          file: blob,
          igdbImageId: s.image_id,
          originalUrl: url,
          sortOrder: i,
          label: `Captura ${i + 1} (IGDB)`,
          tags: ['igdb', 'screenshot'],
        })
        result.screenshots.push(asset)
        onProgress?.(`Captura ${i + 1} lista`)
      } catch { onProgress?.(`Error con captura ${i + 1}`) }
    }
  }

  if (igdbResult.cover?.image_id && result.cover) {
    const bgScreen = result.screenshots[0]
    if (bgScreen) {
      await sb().from('assets').update({ sort_order: -1 }).eq('id', bgScreen.id)
    }
  }

  return result
}

function sb() { return getSupabaseClient() }

export function getAssetUrl(asset: Asset | string): string {
  const path = typeof asset === 'string' ? asset : asset.storage_path
  if (path.startsWith('http')) return path
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/game-images/${path.startsWith('/') ? path.slice(1) : path}`
}

export function igdbImageUrl(imageId: string, size: string = 'cover_big'): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
}

export async function fetchAssetsWithGames(assetType?: string): Promise<any[]> {
  const sb = getSupabaseClient()
  let query = sb
    .from('assets')
    .select('*, game:games(name)')
    .order('created_at', { ascending: false })
  if (assetType) query = query.eq('type', assetType)
  const { data, error } = await query
  if (error) throw error
  return data || []
}
