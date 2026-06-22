import { useState, useEffect, useCallback } from 'react'
import {
  ASSET_TYPES, getGameAssets, createAsset, deleteAsset,
  importGameAssetsFromIgdb, getAssetUrl
} from '../utils/assets'
import type { Asset } from '../utils/assets'
import { searchIgdbGames, igdbImageUrl } from '../utils/igdb'
import {
  Search, X, Loader2, Trash2, FolderOpen, Image,
  Upload, Sparkles
} from 'lucide-react'

interface GameImages {
  home?: string; v_grid?: string; h_grid?: string; logo?: string; icon?: string; screenshots?: string[]; videos?: string[]
}

interface AssetManagerProps {
  gameId: string
  onAssetsChange?: () => void
  showImportIgdb?: boolean
  images?: GameImages
}

export default function AssetManager({ gameId, onAssetsChange, showImportIgdb = true, images }: AssetManagerProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [activeType, setActiveType] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [uploading, setUploading] = useState(false)
  const [igdbQuery, setIgdbQuery] = useState('')
  const [igdbResults, setIgdbResults] = useState<any[]>([])
  const [igdbSearching, setIgdbSearching] = useState(false)
  const [showIgdb, setShowIgdb] = useState(false)
  const [zoomedAsset, setZoomedAsset] = useState<any>(null)

  const fetchAssets = useCallback(async () => {
    if (!gameId) return
    try {
      const data = await getGameAssets(gameId)
      setAssets(data)
    } catch { }
  }, [gameId])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  useEffect(() => {
    if (!igdbQuery || igdbQuery.length < 2) { setIgdbResults([]); return }
    const timer = setTimeout(async () => {
      setIgdbSearching(true)
      try {
        const results = await searchIgdbGames(igdbQuery)
        setIgdbResults(results)
      } catch { setIgdbResults([]) }
      setIgdbSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [igdbQuery])

  const handleImportFromIgdb = async (result: any) => {
    if (!gameId) { setImportProgress('Primero define el ID del juego'); return }
    setImporting(true)
    setImportProgress('Iniciando importación...')
    try {
      await importGameAssetsFromIgdb(gameId, result, (msg) => setImportProgress(msg))
      await fetchAssets()
      onAssetsChange?.()
      setIgdbQuery('')
      setIgdbResults([])
      setImportProgress('¡Importación completada!')
    } catch (e) {
      setImportProgress(`Error: ${e}`)
    }
    setImporting(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (!gameId) { alert('Define el ID del juego antes de subir assets.'); return }
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await createAsset({ gameId, type, file, label: `${type} manual` })
      await fetchAssets()
      onAssetsChange?.()
    } catch { }
    setUploading(false)
  }

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`¿Eliminar este ${asset.type}?`)) return
    await deleteAsset(asset.id)
    await fetchAssets()
    onAssetsChange?.()
  }

  // Map images prop → virtual asset-like items for the active folder
  function getVirtualAssets(type: string): { url: string; label: string; idx: number }[] {
    if (!images) return []
    const igdbMap: Record<string, { url?: string; urls?: string[] }> = {
      home: { url: images.home },
      v_grid: { url: images.v_grid },
      h_grid: { url: images.h_grid },
      logo: { url: images.logo },
      icon: { url: images.icon },
      screenshot: { urls: images.screenshots },
      video: { urls: images.videos },
    }
    const entry = igdbMap[type]
    if (!entry) return []
    if (entry.url) return [{ url: entry.url, label: type, idx: 0 }]
    if (entry.urls) return entry.urls.filter(Boolean).map((url, i) => ({ url, label: `${type} ${i + 1}`, idx: i }))
    return []
  }

  const counts: Record<string, number> = {}
  for (const a of assets) counts[a.type] = (counts[a.type] || 0) + 1
  for (const t of ASSET_TYPES) {
    const virt = getVirtualAssets(t.key)
    if (virt.length) counts[t.key] = (counts[t.key] || 0) + virt.length
  }

  const dbAssets = activeType ? assets.filter(a => a.type === activeType) : []
  const virtAssets = activeType ? getVirtualAssets(activeType) : []
  const activeAssets = [...virtAssets, ...dbAssets] as ({ url: string; label: string; idx: number } | Asset)[]

  return (
    <div className="space-y-4">
      {importProgress && (
        <div className={`text-sm p-3 rounded-xl flex items-center gap-2 ${importProgress.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
          <Loader2 className="animate-spin" size={16} />
          {importProgress}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {ASSET_TYPES.map(t => {
          const count = counts[t.key] || 0
          return (
            <button key={t.key}
              onClick={() => setActiveType(activeType === t.key ? null : t.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${activeType === t.key
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                : count > 0
                  ? 'bg-slate-800/40 border-slate-600/30 text-slate-300 hover:border-slate-500/50 hover:bg-slate-800/60'
                  : 'bg-slate-800/20 border-slate-700/20 text-slate-500 hover:border-slate-600/40 hover:text-slate-400'
                }`}>
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-center">{t.label}</span>
              {count > 0 && (
                <span className="text-[10px] font-mono bg-slate-700/50 px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {showImportIgdb && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder={gameId ? "Buscar en IGDB para importar..." : "Define el ID del juego primero"}
                className="w-full bg-slate-800/50 border border-indigo-500/20 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400 outline-none transition-all"
                value={igdbQuery}
                onChange={e => setIgdbQuery(e.target.value)}
                onFocus={() => igdbResults.length > 0 && setShowIgdb(true)}
                onBlur={() => setTimeout(() => setShowIgdb(false), 200)}
                disabled={!gameId}
              />
              {igdbSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-indigo-400" size={16} />}
            </div>
          </div>

          {showIgdb && igdbResults.length > 0 && (
            <div className="absolute z-30 w-full mt-1 bg-slate-800 rounded-xl border border-slate-700 max-h-60 overflow-y-auto space-y-1 p-1 shadow-2xl">
              {igdbResults.map(r => (
                <button key={r.id}
                  onMouseDown={() => handleImportFromIgdb(r)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-500/10 rounded-lg transition-colors text-left cursor-pointer">
                  {r.cover?.image_id && (
                    <img src={igdbImageUrl(r.cover.image_id, 'cover_small')} alt=""
                      className="w-8 h-11 object-cover rounded bg-slate-700 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                    <p className="text-xs text-slate-400">
                      {r.first_release_date ? new Date(r.first_release_date * 1000).getFullYear() : ''}
                      {r.platforms?.length ? ` · ${r.platforms.map((p: any) => p.abbreviation || p.name).join(', ')}` : ''}
                    </p>
                  </div>
                  {importing ? (
                    <Loader2 className="animate-spin text-indigo-400 shrink-0" size={16} />
                  ) : (
                    <Sparkles size={16} className="text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeType && (
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-indigo-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {ASSET_TYPES.find(t => t.key === activeType)?.label || activeType}
              </h4>
              <span className="text-xs text-slate-500 font-mono">({activeAssets.length})</span>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-lg cursor-pointer transition-all text-xs font-medium text-slate-300">
                <Upload size={14} /> Subir
                <input type="file" accept="image/*,video/mp4" className="hidden" onChange={e => handleUpload(e, activeType)} disabled={uploading || !gameId} />
              </label>
              <input type="text" placeholder="ID personalizado..."
                className="w-28 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none placeholder-slate-600" />
            </div>
          </div>

          {activeAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-600">
              <Image size={32} className="mb-2 opacity-50" />
              <p className="text-xs">Sin {ASSET_TYPES.find(t => t.key === activeType)?.label.toLowerCase() || activeType} aún</p>
              <p className="text-[10px] text-slate-700 mt-1">Sube una imagen o importa desde IGDB</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {activeAssets.map((asset) => {
                const isVirt = 'url' in asset && !('id' in asset)
                const assetUrl = isVirt ? (asset as any).url : getAssetUrl(asset as Asset)
                const assetKey = isVirt ? `virt-${activeType}-${(asset as any).idx}` : (asset as Asset).id
                return (
                  <div key={assetKey} className="group relative">
                    <button
                      onClick={() => setZoomedAsset(asset)}
                      className="w-full bg-slate-900 rounded-lg border border-slate-700/50 overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer shadow-inner flex items-center justify-center" style={{ minHeight: 80 }}>
                      <img src={assetUrl} alt={isVirt ? (asset as any).label : (asset as Asset).label || (asset as Asset).type}
                        className="w-full h-auto object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2264%22 height%3D%2264%22 viewBox%3D%220 0 64 64%22%3E%3Crect fill%3D%22%23304060%22 width%3D%2264%22 height%3D%2264%22%2F%3E%3Ctext fill%3D%22%236480a0%22 font-family%3D%22sans-serif%22 font-size%3D%2216%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                    </button>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[9px] font-mono text-slate-600 truncate flex-1" title={isVirt ? (asset as any).url : (asset as Asset).id}>
                        {isVirt ? 'IGDB' : `${(asset as Asset).id.slice(0, 8)}...`}
                      </span>
                      {!isVirt && (
                        <button onClick={() => handleDelete(asset as Asset)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all cursor-pointer"
                          title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {zoomedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setZoomedAsset(null)}>
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="text-white/50 hover:text-white transition-colors cursor-pointer p-2" onClick={() => setZoomedAsset(null)}><X size={24} /></button>
          </div>
          <div className="max-w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {(zoomedAsset.url || '').includes('img.youtube.com') ? (
              <a href={(zoomedAsset.url || '').replace('/mqdefault.jpg', '')} target="_blank" rel="noopener noreferrer"
                className="group relative max-w-full max-h-[80vh] rounded-lg overflow-hidden shadow-2xl">
                <img src={zoomedAsset.url || getAssetUrl(zoomedAsset)} alt={zoomedAsset.label || zoomedAsset.type}
                  className="max-w-full max-h-[80vh] object-contain" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-lg font-bold px-6 py-3 rounded-xl bg-black/50">▶ Ver en YouTube</span>
                </div>
              </a>
            ) : (
              <img src={zoomedAsset.url || getAssetUrl(zoomedAsset)} alt={zoomedAsset.label || zoomedAsset.type}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
            )}
            <div className="mt-3 flex gap-4 text-[11px] font-mono text-slate-500">
              {zoomedAsset.id && <span>ID: {zoomedAsset.id}</span>}
              {zoomedAsset.type && <span>Type: {zoomedAsset.type}</span>}
              {zoomedAsset.igdb_image_id && <span>IGDB: {zoomedAsset.igdb_image_id}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
