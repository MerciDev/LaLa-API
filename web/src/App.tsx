import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  X,
  Monitor,
  Calendar,
  Hash,
  Sparkles,
  Gamepad2,
  Trophy,
  Edit3,
  Save,
  Copy,
  Trash2
} from 'lucide-react';
import { ImageInput } from './components/ImageInput';

// --- Tipos ---
interface Game {
  id: string;
  name: string;
  console?: string; // Legacy
  releaseDate?: string; // Legacy
  platforms?: { console: string; date: string }[];
  tags: string[];
  description?: string;
  images?: {
    cover: string;
    background: string;
    square: string;
    vertical: string;
    horizontal: string;
    logo: string;
    icon: string;
    screenshots: string[];
  };
  externalIds?: {
    igdb?: string;
    steamGridDb?: string;
    steamDb?: string;
    retroAchievements?: string;
  };
}

const API_URL = 'http://localhost:4000/api/games';
const ADMIN_TOKEN = 'secret_mega_secure_token_2025';

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredGameId, setHoveredGameId] = useState<string | null>(null);
  const [consoles, setConsoles] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    axios.get('http://localhost:4000/api/consoles').then(res => setConsoles(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchGames();
  }, [search]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const query = search || 'a';
      const res = await axios.get(`${API_URL}/search?q=${query}`);
      const results = Array.isArray(res.data.results) ? res.data.results : [];
      setGames(results);
    } catch (err) {
      console.error("Error fetching games:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/${id}`);
      const game = res.data;
      if (!game.images) {
        game.images = {
          cover: '', background: '', square: '', vertical: '', horizontal: '', logo: '', icon: '', screenshots: []
        };
      }
      // Migration for legacy data
      if (!game.platforms || game.platforms.length === 0) {
        game.platforms = [{ console: game.console || '', date: game.releaseDate || '' }];
      }

      setSelectedGame(game);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error loading game details", err);
    }
  };

  const handleCreate = () => {
    setSelectedGame({
      id: '',
      name: '',
      console: '',
      releaseDate: '',
      platforms: [{ console: '', date: '' }],
      tags: [],
      description: '',
      images: {
        cover: '',
        background: '',
        square: '',
        vertical: '',
        horizontal: '',
        logo: '',
        icon: '',
        screenshots: []
      }
    });
    setIsModalOpen(true);
  }

  const handleSave = async () => {
    if (!selectedGame) return;

    try {
      await axios.post(API_URL, selectedGame, {
        headers: { 'x-admin-token': ADMIN_TOKEN }
      });
      setIsModalOpen(false);
      fetchGames();
    } catch (e) {
      console.error("Error saving game", e);
      alert('Error saving game (Backend offline).');
    }
  };

  const handleDuplicate = () => {
    if (!selectedGame) return;

    // Confirm with user
    if (!window.confirm("¿Duplicar este juego? Se generará una copia con el mismo contenido.")) return;

    const duplicatedGame: Game = {
      ...selectedGame,
      id: `${selectedGame.id}-copy`,
      name: `${selectedGame.name} (Copy)`,
      platforms: selectedGame.platforms ? [...selectedGame.platforms] : [{ console: selectedGame.console || '', date: selectedGame.releaseDate || '' }],
      images: selectedGame.images ? { ...selectedGame.images } : undefined
    };
    setSelectedGame(duplicatedGame);
  };

  const handleDelete = async () => {
    if (!selectedGame || !selectedGame.id) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este juego? Esta acción no se puede deshacer.")) return;

    try {
      await axios.delete(`${API_URL}/${selectedGame.id}`, {
        headers: { 'x-admin-token': ADMIN_TOKEN }
      });
      setIsModalOpen(false);
      fetchGames();
    } catch (e) {
      console.error("Error deleting game", e);
      alert('Error al eliminar el juego.');
    }
  };

  const addPlatform = () => {
    if (!selectedGame) return;
    const currentPlatforms = selectedGame.platforms || [];
    setSelectedGame({ ...selectedGame, platforms: [...currentPlatforms, { console: '', date: '' }] });
  };

  const removePlatform = (index: number) => {
    if (!selectedGame || !selectedGame.platforms) return;
    const newPlatforms = [...selectedGame.platforms];
    newPlatforms.splice(index, 1);
    setSelectedGame({ ...selectedGame, platforms: newPlatforms });
  };

  const updatePlatform = (index: number, field: 'console' | 'date', value: string) => {
    if (!selectedGame || !selectedGame.platforms) return;
    const newPlatforms = [...selectedGame.platforms];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };

    // Update legacy fields for compatibility if modifying first item
    const legacyUpdate = index === 0 ? (field === 'console' ? { console: value } : { releaseDate: value }) : {};

    setSelectedGame({ ...selectedGame, platforms: newPlatforms, ...legacyUpdate });
  };

  // Función auxiliar para obtener la URL de la imagen
  const getImageUrl = (url?: string) => {
    if (!url) return 'https://via.placeholder.com/300x400/1e293b/475569?text=No+Cover';
    if (url.startsWith('http')) return url;
    return `http://localhost:4000${url}`;
  };

  const getConsoleName = (id?: string) => {
    if (!id) return 'Desconocido';
    const c = consoles.find(c => c.id === id);
    return c ? c.name : id; // Fallback to ID if not found (supports legacy names)
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">

      {/* --- Fondo Ambiental --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/15 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* --- Navbar Glassmorphism --- */}
        <nav className="sticky top-4 z-40 mb-12">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex justify-between items-center shadow-2xl shadow-black/20">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                <Gamepad2 className="text-white drop-shadow-md" size={24} />
                <div className="absolute inset-0 bg-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  LaLa <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Hub</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium tracking-wide">ULTIMATE COLLECTION</p>
              </div>
            </div>

            <div className="flex items-center gap-4">

              <button
                onClick={handleCreate}
                className="hidden sm:flex bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] active:scale-95 items-center gap-2 cursor-pointer"
              >
                <Plus size={18} strokeWidth={3} /> Añadir Juego
              </button>
              {/* Mobile Add Button */}
              <button onClick={handleCreate} className="sm:hidden w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-lg active:scale-95 cursor-pointer">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </nav>

        {/* --- Hero & Búsqueda --- */}
        <div className="flex flex-col items-center justify-center mb-16 space-y-8 text-center px-4">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              Explora tu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
                Universo Gaming
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-lg mx-auto">
              Gestiona, descubre y organiza tu colección personal con estilo.
            </p>
          </div>

          <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-40 blur group-hover:opacity-70 transition duration-500" />
            <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl flex items-center p-1 shadow-2xl">
              <div className="pl-4 pr-3 text-slate-400">
                <Search size={22} />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, consola..."
                className="w-full bg-transparent border-none text-white text-lg px-2 py-3 focus:ring-0 placeholder-slate-500 outline-none font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- Grid de Juegos (Estilo Profesional) --- */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-white/5 border-dashed">
            <Trophy className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No se encontraron juegos en tu colección.</p>
            <button onClick={() => setSearch('')} className="mt-4 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
            {games.map((game, index) => (
              <div
                key={game.id || index}
                onMouseEnter={() => setHoveredGameId(game.id)}
                onMouseLeave={() => setHoveredGameId(null)}
                onClick={() => handleEdit(game.id)}
                className="group relative bg-slate-800/40 rounded-[2rem] p-3 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] cursor-pointer"
              >
                {/* Imagen Cover */}
                <div className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden bg-slate-900 shadow-inner">
                  <img
                    src={getImageUrl(game.images?.cover)}
                    alt={game.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400/1e293b/475569?text=Error'; }}
                  />

                  {/* Overlay Gradient on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <button className="w-full bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer">
                        <Edit3 size={16} /> Editar
                      </button>
                    </div>
                  </div>

                  {/* Console Tag Badge - Vertical Stack */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
                    {(game.platforms?.length ? game.platforms : [{ console: game.console }]).map((p, i) => (
                      <div key={i} className="bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide text-white shadow-xl uppercase whitespace-nowrap">
                        {getConsoleName(p.console)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Card */}
                <div className="px-2 pt-4 pb-2 text-center">
                  <h3 className="font-bold text-lg text-white mb-1 truncate px-1" title={game.name}>
                    {game.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Calendar size={12} />
                    <span>{game.releaseDate?.split('-')[0] || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- Modal de Edición (Modern Panel) --- */}
        {isModalOpen && selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/10 animate-in fade-in zoom-in-95 duration-200">

              {/* Columna Izquierda (Preview Visual) */}
              <div className="hidden md:flex md:w-[40%] bg-gradient-to-br from-slate-900 to-slate-800 relative flex-col items-center justify-center p-12 border-r border-white/5">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]" />

                <div className="relative z-10 w-64 aspect-[3/4] bg-slate-900 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-slate-800 group">
                  <img
                    src={getImageUrl(selectedGame.images?.cover)}
                    className="w-full h-full object-cover"
                    alt="Preview"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400/1e293b/475569?text=Preview'; }}
                  />
                  {/* Reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
                </div>

                <div className="mt-8 text-center relative z-10">
                  <h2 className="text-3xl font-black text-white mb-2 leading-tight">{selectedGame.name || 'Nuevo Juego'}</h2>
                  <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase">
                    {selectedGame.console || 'Plataforma'}
                  </span>
                </div>
              </div>

              {/* Columna Derecha (Formulario) */}
              <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                {/* Header Modal */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles size={18} className="text-yellow-400" />
                      {selectedGame.id ? 'Editar Metadatos' : 'Crear Nueva Entrada'}
                    </h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Título del Juego</label>
                      <div className="relative group">
                        <Monitor className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ej. Super Mario Odyssey"
                          value={selectedGame.name}
                          onChange={e => setSelectedGame({ ...selectedGame, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ID Slug</label>
                      <div className="relative group">
                        <Hash className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm font-mono text-slate-300 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all"
                          placeholder="super-mario-odyssey"
                          value={selectedGame.id}
                          onChange={e => setSelectedGame({ ...selectedGame, id: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Plataformas y Lanzamientos</h4>
                        <button onClick={addPlatform} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md transition-colors cursor-pointer">
                          <Plus size={14} /> Añadir Consola
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(selectedGame.platforms && selectedGame.platforms.length > 0 ? selectedGame.platforms : [{ console: '', date: '' }]).map((p, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-800/30 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                            <div className="flex-1 space-y-1 w-full">
                              <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Consola</label>
                              <div className="relative">
                                <Gamepad2 className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                <select
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all appearance-none"
                                  value={p.console}
                                  onChange={e => updatePlatform(idx, 'console', e.target.value)}
                                >
                                  <option value="" disabled>Selecciona consola...</option>
                                  {consoles.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                  <option value="other">Otro / Desconocido</option>
                                </select>
                              </div>
                            </div>
                            <div className="w-full md:w-48 space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Fecha</label>
                              <div className="relative">
                                <input
                                  type="date"
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all [color-scheme:dark]"
                                  value={p.date}
                                  onChange={e => updatePlatform(idx, 'date', e.target.value)}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => removePlatform(idx)}
                              className="mt-6 p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer self-end md:self-auto"
                              title="Eliminar plataforma"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">IDs Externos</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">IGDB ID</label>
                          <input className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none"
                            placeholder="123456"
                            value={selectedGame.externalIds?.igdb || ''}
                            onChange={e => setSelectedGame({ ...selectedGame, externalIds: { ...selectedGame.externalIds, igdb: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">SteamGridDB ID</label>
                          <input className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none"
                            placeholder="12345"
                            value={selectedGame.externalIds?.steamGridDb || ''}
                            onChange={e => setSelectedGame({ ...selectedGame, externalIds: { ...selectedGame.externalIds, steamGridDb: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Steam AppID</label>
                          <input className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none"
                            placeholder="570"
                            value={selectedGame.externalIds?.steamDb || ''}
                            onChange={e => setSelectedGame({ ...selectedGame, externalIds: { ...selectedGame.externalIds, steamDb: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Retro Achv ID</label>
                          <input className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none"
                            placeholder="52"
                            value={selectedGame.externalIds?.retroAchievements || ''}
                            onChange={e => setSelectedGame({ ...selectedGame, externalIds: { ...selectedGame.externalIds, retroAchievements: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-white/10 pb-2 mb-4">Assets Gráficos</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ImageInput
                          label="Portada (Cover)"
                          value={selectedGame.images?.cover || ''}
                          gameId={selectedGame.id}
                          type="cover"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), cover: url } })}
                        />
                        <ImageInput
                          label="Heroe (Background)"
                          value={selectedGame.images?.background || ''}
                          gameId={selectedGame.id}
                          type="background"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), background: url } })}
                        />
                        <ImageInput
                          label="Logo"
                          value={selectedGame.images?.logo || ''}
                          gameId={selectedGame.id}
                          type="logo"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), logo: url } })}
                        />
                        <ImageInput
                          label="Icono"
                          value={selectedGame.images?.icon || ''}
                          gameId={selectedGame.id}
                          type="icon"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), icon: url } })}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-4">
                        <ImageInput
                          label="Grid Vertical"
                          value={selectedGame.images?.vertical || ''}
                          gameId={selectedGame.id}
                          type="vertical"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), vertical: url } })}
                        />
                        <ImageInput
                          label="Grid Horizontal"
                          value={selectedGame.images?.horizontal || ''}
                          gameId={selectedGame.id}
                          type="horizontal"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), horizontal: url } })}
                        />
                        <ImageInput
                          label="Grid Cuadrado"
                          value={selectedGame.images?.square || ''}
                          gameId={selectedGame.id}
                          type="square"
                          onChange={(url) => setSelectedGame({ ...selectedGame, images: { ...(selectedGame.images!), square: url } })}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descripción</label>
                      <textarea
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all h-32 resize-none leading-relaxed"
                        placeholder="Escribe una breve sinopsis..."
                        value={selectedGame.description || ''}
                        onChange={e => setSelectedGame({ ...selectedGame, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Modal */}
                <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md sticky bottom-0 z-20 flex justify-end gap-4">
                  <div className="flex-1 flex justify-start gap-2">
                    <button
                      onClick={handleDuplicate}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors cursor-pointer border border-transparent hover:border-indigo-500/20"
                      title="Duplicar como nuevo juego"
                    >
                      <Copy size={16} />
                      Duplicar
                    </button>
                    {selectedGame.id && (
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                        title="Eliminar juego permanentemente"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all cursor-pointer"
                  >
                    <Save size={18} />
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;