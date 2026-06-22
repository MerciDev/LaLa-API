import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { searchIgdbGames, igdbImageUrl, fetchIgdbGameById } from './utils/igdb'
import { searchSgdbGames, fetchSgdbGrids, fetchSgdbHeroes, fetchSgdbLogos, fetchSgdbIcons } from './utils/steamgriddb'
import AssetManager from './components/AssetManager'
import { getAssetUrl, getGameAssets, getSupabaseClient } from './utils/assets'

// --- Tipos ---
interface Game {
  id: string
  name: string
  console?: string
  releaseDate?: string
  tags: string[]
  description?: string
  images?: {
    home: string
    v_grid: string
    h_grid: string
    logo: string
    icon: string
    screenshots: string[]
    videos: string[]
  }
  externalIds?: {
    igdb?: string
    steamGridDb?: string
    steamDb?: string
    retroAchievements?: string
  }
}

type AuthView = 'login' | 'register'

// --- Utils ---
function flattenGame(row: any): Game {
  return { id: row.id, name: row.name, ...(row.data || {}) }
}

function trimGame(g: Game) {
  const { id, name, console, releaseDate, tags, description, images, externalIds } = g
  return { id, name, data: { console, releaseDate, tags, description, images, externalIds } }
}

// --- Icons ---
import {
  Search, Plus, X, Monitor, Calendar, Hash, Sparkles, Gamepad2,
  Trophy, Edit3, Save, Copy, Trash2, RefreshCw, LogIn, LogOut, UserPlus, Mail, Lock, Loader2
} from 'lucide-react'

function App() {
  const sb = () => getSupabaseClient()

  const [user, setUser] = useState<User | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView>('login')

  const [games, setGames] = useState<Game[]>([])
  const [search, setSearch] = useState('')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // IGDB search
  const [igdbQuery, setIgdbQuery] = useState('')
  const [igdbResults, setIgdbResults] = useState<any[]>([])
  const [igdbSearching, setIgdbSearching] = useState(false)
  const [showIgdbResults, setShowIgdbResults] = useState(false)
  const [igdbReloading, setIgdbReloading] = useState(false)

  // Restore session
  const [sgdbOptions, setSgdbOptions] = useState<Record<string, any[]>>({})
  const [zoomedSgdbImage, setZoomedSgdbImage] = useState<string | null>(null)
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user)
      setSessionLoading(false)
    })
  }, [])

  // Fetch games
  useEffect(() => {
    if (!user) return
    fetchGames()
  }, [search, user])

  const fetchGames = async () => {
    try {
      setLoading(true)
      setError(null)
      const q = search || undefined
      let query = sb().from('games').select('*').order('name')
      if (q) query = query.ilike('name', `%${q.replace(/%/g, '\\%')}%`)
      const { data, error: err } = await query.limit(50)
      if (err) throw err
      setGames((data || []).map(flattenGame))
    } catch (err: any) {
      console.error('Error fetching games:', err)
      setError(err.message || 'Error al cargar juegos')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async () => {
    setAuthError(null)
    try {
      const { error: err } = authView === 'login'
        ? await sb().auth.signInWithPassword({ email, password })
        : await sb().auth.signUp({ email, password })
      if (err) throw err
      if (authView === 'register') {
        setAuthView('login')
        setAuthError('Cuenta creada. Inicia sesión.')
        return
      }
      const { data } = await sb().auth.getSession()
      if (data.session?.user) setUser(data.session.user)
    } catch (err: any) {
      setAuthError(err.message)
    }
  }

  const handleLogout = async () => {
    await sb().auth.signOut()
    setUser(null)
    setGames([])
  }

  const handleEdit = async (id: string) => {
    try {
      const { data, error: err } = await sb().from('games').select('*').eq('id', id).maybeSingle()
      if (err) throw err
      if (!data) return
      const game = flattenGame(data)
      if (!game.images) game.images = { home: '', v_grid: '', h_grid: '', logo: '', icon: '', screenshots: [], videos: [] }
      setSgdbOptions({})
      setSelectedGame(game)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Error loading game details', err)
    }
  }

  const handleCreate = () => {
    setSelectedGame({
      id: '', name: '', console: '', releaseDate: '',
      tags: [], description: '',
      images: { home: '', v_grid: '', h_grid: '', logo: '', icon: '', screenshots: [], videos: [] }
    })
    setSgdbOptions({})
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!selectedGame) return
    try {
      const record = trimGame(selectedGame)
      const { error: err } = await sb().from('games').upsert(record, { onConflict: 'id' })
      if (err) throw err
      setIsModalOpen(false)
      fetchGames()
    } catch (e: any) {
      console.error('Error saving game', e)
      alert(`Error saving game: ${e.message}`)
    }
  }

  const handleDuplicate = () => {
    if (!selectedGame) return
    if (!window.confirm('¿Duplicar este juego?')) return
    setSelectedGame({
      ...selectedGame,
      id: `${selectedGame.id}-copy`,
      name: `${selectedGame.name} (Copy)`,
      images: selectedGame.images ? { ...selectedGame.images } : undefined
    })
  }

  const handleDelete = async () => {
    if (!selectedGame?.id) return
    if (!window.confirm('¿Estás seguro de eliminar este juego?')) return
    try {
      const { error: err } = await sb().from('games').delete().eq('id', selectedGame.id)
      if (err) throw err
      setIsModalOpen(false)
      fetchGames()
    } catch (e) {
      console.error('Error deleting game', e)
      alert('Error al eliminar el juego.')
    }
  }

  const getImageUrl = (url?: string) => {
    if (!url) return 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22300%22 height%3D%22400%22 viewBox%3D%220 0 300 400%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22300%22 height%3D%22400%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3ENo Cover%3C%2Ftext%3E%3C%2Fsvg%3E'
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/game-images${url.startsWith('/') ? '' : '/'}${url}`
  }

  const getConsoleName = (name?: string) => name || 'Desconocido'

  // Debounced IGDB search
  useEffect(() => {
    if (!igdbQuery || igdbQuery.length < 2) { setIgdbResults([]); return }
    const timer = setTimeout(async () => {
      setIgdbSearching(true)
      try {
        const results = await searchIgdbGames(igdbQuery)
        setIgdbResults(results)
        setShowIgdbResults(true)
      } catch { setIgdbResults([]) }
      setIgdbSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [igdbQuery])

  function applyIgdbResult(game: any) {
    const igdbId = game.id
    const slug = game.slug || game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const date = game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().split('T')[0] : ''
    const firstPlatform = (game.platforms || [])[0]
    const platformName = firstPlatform ? (firstPlatform.abbreviation || firstPlatform.name) : ''
    if (!selectedGame) return
    setSelectedGame({
      ...selectedGame,
      name: game.name,
      id: slug,
      console: platformName,
      releaseDate: date,
      tags: selectedGame.tags || [],
      description: game.summary || '',
      externalIds: { ...selectedGame.externalIds, igdb: String(igdbId) },
      images: {
        home: '', v_grid: '', h_grid: '',
        logo: '', icon: '', screenshots: [], videos: []
      }
    })
    setIgdbQuery('')
    setShowIgdbResults(false)

    fetchSgdbImages(game.name)
  }

  async function fetchSgdbImages(gameName: string, existingSgdbId?: number) {
    let sgdbId = existingSgdbId
    if (!sgdbId) {
      const results = await searchSgdbGames(gameName)
      if (!results.length) return
      sgdbId = results[0].id
    }

    const [grids, heroes, logos, icons] = await Promise.all([
      fetchSgdbGrids(sgdbId),
      fetchSgdbHeroes(sgdbId),
      fetchSgdbLogos(sgdbId),
      fetchSgdbIcons(sgdbId),
    ])

    const vGridList = grids.filter(g => g.width === 600 && g.height === 900).slice(0, 10)
    if (vGridList.length === 0) vGridList.push(...grids.slice(0, 10))

    const hGridList = grids.filter(g => (g.width === 920 && g.height === 430) || (g.width === 460 && g.height === 215)).slice(0, 10)
    if (hGridList.length === 0) hGridList.push(...grids.slice(0, 10))

    const homeList = grids.filter(g => g.width === g.height).slice(0, 10)
    if (homeList.length === 0) homeList.push(...icons.slice(0, 10))

    const logoList = logos.slice(0, 10)
    const iconList = icons.slice(0, 10)

    setSgdbOptions({
      home: homeList,
      v_grid: vGridList,
      h_grid: hGridList,
      logo: logoList,
      icon: iconList
    })

    const vGrid = vGridList[0]
    const hGrid = hGridList[0]
    const home = homeList[0]

    setSelectedGame((prev: any) => prev ? {
      ...prev,
      externalIds: { ...prev.externalIds, steamGridDb: String(sgdbId) },
      images: {
        ...prev.images,
        home: home?.url || prev.images?.home || '',
        v_grid: vGrid?.url || prev.images?.v_grid || '',
        h_grid: hGrid?.url || prev.images?.h_grid || '',
        logo: logoList[0]?.url || prev.images?.logo || '',
        icon: iconList[0]?.url || prev.images?.icon || '',
      }
    } : prev)
  }

  const handleReloadIgdb = useCallback(async () => {
    if (!selectedGame?.externalIds?.igdb) return
    setIgdbReloading(true)
    try {
      const game = await fetchIgdbGameById(Number(selectedGame.externalIds.igdb))
      if (game) {
        const slug = game.slug || game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const date = game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().split('T')[0] : ''
        const firstPlatform = (game.platforms || [])[0]
        const console = firstPlatform ? (firstPlatform.abbreviation || firstPlatform.name) : ''

        setSelectedGame(prev => prev ? {
          ...prev,
          name: game.name,
          id: slug,
          console,
          releaseDate: date,
          description: game.summary || '',
        } : prev)
        fetchSgdbImages(game.name, selectedGame.externalIds?.steamGridDb ? Number(selectedGame.externalIds.steamGridDb) : undefined)
      }
    } catch {}
    setIgdbReloading(false)
  }, [selectedGame?.externalIds?.igdb, selectedGame?.externalIds?.steamGridDb])

  // --- Auth Screen ---
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={48} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/15 rounded-full blur-[120px] mix-blend-screen" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <Gamepad2 className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-black text-white">LaLa <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Hub</span></h1>
              <p className="text-sm text-slate-400 mt-1">Panel de Administración</p>
            </div>

            {authError && (
              <div className={`text-sm text-center mb-4 p-3 rounded-xl ${authError.includes('creada') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {authError}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
                <input
                  type="email" placeholder="Email"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
                <input
                  type="password" placeholder="Contraseña"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                />
              </div>
              <button
                onClick={handleAuth}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
              >
                {authView === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                {authView === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setAuthView(authView === 'login' ? 'register' : 'login'); setAuthError(null) }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {authView === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Main Admin Panel ---
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/15 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <nav className="sticky top-4 z-40 mb-12">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex justify-between items-center shadow-2xl shadow-black/20">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                <Gamepad2 className="text-white drop-shadow-md" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  LaLa <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Hub</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium tracking-wide">ADMIN PANEL</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-xs text-slate-500">{user.email}</span>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors cursor-pointer" title="Cerrar sesión">
                <LogOut size={20} />
              </button>
              <button onClick={handleCreate} className="hidden sm:flex bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] active:scale-95 items-center gap-2 cursor-pointer">
                <Plus size={18} strokeWidth={3} /> Añadir Juego
              </button>
              <button onClick={handleCreate} className="sm:hidden w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-lg active:scale-95 cursor-pointer">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </nav>

        <div className="flex flex-col items-center justify-center mb-16 space-y-8 text-center px-4">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              Explora tu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">Universo Gaming</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-lg mx-auto">Gestiona, descubre y organiza tu colección personal con estilo.</p>
          </div>

          <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-40 blur group-hover:opacity-70 transition duration-500" />
            <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl flex items-center p-1 shadow-2xl">
              <div className="pl-4 pr-3 text-slate-400"><Search size={22} /></div>
              <input type="text" placeholder="Buscar por nombre..."
                className="w-full bg-transparent border-none text-white text-lg px-2 py-3 focus:ring-0 placeholder-slate-500 outline-none font-medium"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" /></div>
        ) : error ? (
          <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20">
            <Monitor className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-red-200 mb-2">Error</h3>
            <p className="text-red-300/70 mb-6">{error}</p>
            <button onClick={fetchGames} className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2 mx-auto">
              <RefreshCw size={18} /> Reintentar
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-white/5 border-dashed">
            <Trophy className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No se encontraron juegos.</p>
            <button onClick={() => setSearch('')} className="mt-4 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">Limpiar búsqueda</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
            {games.map((game, index) => (
              <div key={game.id || index}
                onClick={() => handleEdit(game.id)}
                className="group relative bg-slate-800/40 rounded-[2rem] p-3 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] cursor-pointer"
              >
                <div className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden bg-slate-900 shadow-inner">
                  <img src={getImageUrl(game.images?.v_grid)} alt={game.name} loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22300%22 height%3D%22400%22 viewBox%3D%220 0 300 400%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22300%22 height%3D%22400%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3EError%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <button className="w-full bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer">
                        <Edit3 size={16} /> Editar
                      </button>
                    </div>
                  </div>
                  {game.console && (
                    <div className="absolute top-3 right-3 pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide text-white shadow-xl uppercase whitespace-nowrap">
                        {getConsoleName(game.console)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-2 pt-4 pb-2 text-center">
                  <h3 className="font-bold text-lg text-white mb-1 truncate px-1" title={game.name}>{game.name}</h3>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Calendar size={12} />
                    <span>{game.releaseDate?.split('-')[0] || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/10 animate-in fade-in zoom-in-95 duration-200">
              <div className="hidden md:flex md:w-[40%] bg-gradient-to-br from-slate-900 to-slate-800 relative flex-col items-center justify-center p-12 border-r border-white/5">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]" />
                <div className="relative z-10 w-64 aspect-[3/4] bg-slate-900 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-slate-800 group">
                  <img src={getImageUrl(selectedGame.images?.v_grid)} className="w-full h-full object-cover" alt="Preview"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22300%22 height%3D%22400%22 viewBox%3D%220 0 300 400%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22300%22 height%3D%22400%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3EPreview%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                </div>
                <div className="mt-8 text-center relative z-10">
                  <h2 className="text-3xl font-black text-white mb-2 leading-tight">{selectedGame.name || 'Nuevo Juego'}</h2>
                  <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase">
                    {selectedGame.console || 'Plataforma'}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    {selectedGame.id ? 'Editar Metadatos' : 'Crear Nueva Entrada'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedGame.externalIds?.igdb && (
                      <button onClick={handleReloadIgdb} disabled={igdbReloading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-semibold text-indigo-400 transition-all cursor-pointer disabled:opacity-50">
                        {igdbReloading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                        Recargar IGDB
                      </button>
                    )}
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"><X size={20} /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Título del Juego</label>
                      <div className="relative group">
                        <Monitor className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all"
                          placeholder="Ej. Super Mario Odyssey" value={selectedGame.name}
                          onChange={e => setSelectedGame({ ...selectedGame, name: e.target.value })} />
                      </div>
                    </div>

{!selectedGame.id && (
  <div className="col-span-1 md:col-span-2 space-y-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 p-5">
    <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
      <Search size={16} /> Importar desde IGDB
    </div>
    <p className="text-xs text-slate-500 -mt-1">Escribe el nombre para buscar sugerencias</p>
    <div className="relative">
      <input className="w-full bg-slate-800/70 border border-indigo-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-400 outline-none transition-all text-sm"
        placeholder="Buscar en IGDB..."
        value={igdbQuery}
        onChange={e => setIgdbQuery(e.target.value)}
        onFocus={() => igdbResults.length > 0 && setShowIgdbResults(true)}
        onBlur={() => setTimeout(() => setShowIgdbResults(false), 200)} />
      {igdbSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-indigo-400" size={20} />}
    </div>
    {showIgdbResults && igdbResults.length > 0 && (
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-h-60 overflow-y-auto space-y-1 p-1">
        {igdbResults.map((r: any) => (
          <button key={r.id}
            onMouseDown={() => applyIgdbResult(r)}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-500/10 rounded-lg transition-colors text-left cursor-pointer">
            {r.cover?.image_id && (
              <img src={igdbImageUrl(r.cover.image_id, 'cover_small')} alt=""
                className="w-10 h-14 object-cover rounded-lg bg-slate-700" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{r.name}</p>
              <p className="text-xs text-slate-400">
                {r.first_release_date ? new Date(r.first_release_date * 1000).getFullYear() : ''}
                {r.platforms?.length ? ` · ${r.platforms.map((p: any) => p.abbreviation || p.name).join(', ')}` : ''}
              </p>
            </div>
            <Plus size={16} className="text-indigo-400 shrink-0" />
          </button>
        ))}
      </div>
    )}
  </div>
)}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ID Slug</label>
                      <div className="relative group">
                        <Hash className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none transition-all"
                          placeholder="super-mario-odyssey" value={selectedGame.id}
                          onChange={e => setSelectedGame({ ...selectedGame, id: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Plataforma</label>
                        <div className="relative">
                          <Gamepad2 className="absolute left-3 top-3 text-slate-500" size={16} />
                          <input className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all"
                            placeholder="Ej. Nintendo Switch, PC, PS5..."
                            value={selectedGame.console || ''} onChange={e => setSelectedGame({ ...selectedGame, console: e.target.value })} />
                        </div>
                      </div>
                      <div className="w-full md:w-56 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha de lanzamiento</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 text-slate-500" size={16} />
                          <input type="date" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-300 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all [color-scheme:dark]"
                            value={selectedGame.releaseDate || ''} onChange={e => setSelectedGame({ ...selectedGame, releaseDate: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">IDs Externos</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {(['igdb', 'steamGridDb', 'steamDb', 'retroAchievements'] as const).map(field => (
                          <div key={field} className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">{field}</label>
                            <input className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none"
                              value={(selectedGame.externalIds as any)?.[field] || ''}
                              onChange={e => setSelectedGame({ ...selectedGame, externalIds: { ...selectedGame.externalIds, [field]: e.target.value } })} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {Object.keys(sgdbOptions).length > 0 && (
                      <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={16} /> Opciones SteamGridDB
                          </h4>
                          <button onClick={() => setSgdbOptions({})} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
                            <X size={14} /> Ocultar
                          </button>
                        </div>
                        <div className="space-y-4">
                          {(['home', 'v_grid', 'h_grid', 'logo', 'icon'] as const).map(type => {
                            const options = sgdbOptions[type] || [];
                            if (!options.length) return null;
                            return (
                              <div key={type} className="space-y-2">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase">{type}</h5>
                                <div className="grid grid-cols-5 gap-4 p-3">
                                  {options.map((opt: any) => (
                                    <button
                                      key={opt.id}
                                      onClick={() => setSelectedGame((prev: any) => prev ? { ...prev, images: { ...prev.images, [type]: opt.url } } : prev)}
                                      onContextMenu={(e) => { e.preventDefault(); setZoomedSgdbImage(opt.url) }}
                                      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer bg-slate-900 ${
                                        selectedGame.images?.[type] === opt.url
                                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-110 shadow-xl shadow-indigo-500/30 z-10'
                                          : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100 z-0 hover:scale-105'
                                      }`}
                                      style={{ height: '90px' }}
                                    >
                                      <img src={opt.thumb || opt.url} alt="" className="h-full w-full object-contain" loading="lazy" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-white/10 pb-2 mb-4">
                        Assets Gráficos
                        <span className="text-xs text-slate-500 font-normal ml-2">— organizado por carpetas</span>
                      </h4>
                      <AssetManager
                        gameId={selectedGame.id}
                        images={selectedGame.images}
                        showImportIgdb={false}
                        onAssetsChange={async () => {
                          const assets = await getGameAssets(selectedGame.id).catch(() => [])
                          const home = assets.find(a => a.type === 'home')
                          const v_grid = assets.find(a => a.type === 'v_grid')
                          const h_grid = assets.find(a => a.type === 'h_grid')
                          const logo = assets.find(a => a.type === 'logo')
                          const icon = assets.find(a => a.type === 'icon')
                          const screenshots = assets.filter(a => a.type === 'screenshot')
                          const videos = assets.filter(a => a.type === 'video')
                          setSelectedGame(prev => prev ? {
                            ...prev,
                            images: {
                              home: home ? getAssetUrl(home) : (prev.images?.home || ''),
                              v_grid: v_grid ? getAssetUrl(v_grid) : (prev.images?.v_grid || ''),
                              h_grid: h_grid ? getAssetUrl(h_grid) : (prev.images?.h_grid || ''),
                              logo: logo ? getAssetUrl(logo) : (prev.images?.logo || ''),
                              icon: icon ? getAssetUrl(icon) : (prev.images?.icon || ''),
                              screenshots: screenshots.map(s => getAssetUrl(s)),
                              videos: videos.map(v => getAssetUrl(v))
                            }
                          } : prev)
                        }}
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descripción</label>
                      <textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all h-32 resize-none leading-relaxed"
                        placeholder="Escribe una breve sinopsis..." value={selectedGame.description || ''}
                        onChange={e => setSelectedGame({ ...selectedGame, description: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md sticky bottom-0 z-20 flex justify-end gap-4">
                  <div className="flex-1 flex justify-start gap-2">
                    <button onClick={handleDuplicate}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors cursor-pointer border border-transparent hover:border-indigo-500/20">
                      <Copy size={16} /> Duplicar
                    </button>
                    {selectedGame.id && (
                      <button onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    )}
                  </div>
                  <button onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">Cancelar</button>
                  <button onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all cursor-pointer">
                    <Save size={18} /> Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {zoomedSgdbImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setZoomedSgdbImage(null)}>
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="text-white/50 hover:text-white transition-colors cursor-pointer p-2"><X size={24} /></button>
            </div>
            <img src={zoomedSgdbImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  )
}



export default App
