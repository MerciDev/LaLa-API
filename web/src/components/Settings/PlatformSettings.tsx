import { useState, useEffect } from 'react'
import { X, Settings, Gamepad2, Save, CheckCircle2, Plus, Loader2, Trash2 } from 'lucide-react'
import SettingsForm from './SettingsForm'
import type { PlatformConfig } from './SettingsForm'
import { fetchPlatforms, savePlatform, deletePlatform } from '../../utils/platforms'

interface PlatformSettingsProps {
  onClose: () => void
}

export default function PlatformSettings({ onClose }: PlatformSettingsProps) {
  const [config, setConfig] = useState<Record<string, PlatformConfig>>({})
  const [activePlatform, setActivePlatform] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch initial data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPlatforms()
        setConfig(data)
        
        const ids = Object.keys(data)
        if (ids.length > 0) {
          setActivePlatform(ids[0])
        } else {
          // Si no hay datos, creamos una plataforma por defecto vacía para empezar
          handleAddPlatform(false)
        }
      } catch (err) {
        console.error("Failed to load platforms", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSave = async () => {
    if (!activePlatform || !config[activePlatform]) return
    
    setIsSaving(true)
    try {
      // Guardamos la configuración de la plataforma actual
      await savePlatform(config[activePlatform])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("Failed to save platform", err)
      alert("Error al guardar la plataforma en la base de datos.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfigChange = (updatedPlatform: PlatformConfig) => {
    if (updatedPlatform.id !== activePlatform && updatedPlatform.id.trim() !== '') {
      const newConfig: Record<string, PlatformConfig> = {}
      for (const [key, val] of Object.entries(config)) {
        if (key === activePlatform) {
          newConfig[updatedPlatform.id] = updatedPlatform
        } else {
          newConfig[key] = val
        }
      }
      setConfig(newConfig)
      setActivePlatform(updatedPlatform.id)
    } else {
      setConfig(prev => ({
        ...prev,
        [activePlatform]: updatedPlatform
      }))
    }
  }

  const handleAddPlatform = (setAsActive = true) => {
    const newId = `new_plat_${Date.now()}`
    const newPlatform: PlatformConfig = {
      id: newId,
      name: 'Nueva Plataforma',
      abbreviation: '',
      nameImage: '',
      releaseDate: '',
      romPath: '',
      biosPath: '',
      enableRichPresence: true,
      consoleImage: '',
      iconImage: '',
      defaultAppId: 'app_1',
      apps: [
        { id: 'app_1', name: 'Emulador Principal', executablePath: '', args: '', useRetroarch: false }
      ]
    }
    setConfig(prev => ({ ...prev, [newId]: newPlatform }))
    if (setAsActive) {
      setActivePlatform(newId)
    }
  }

  const handleDeletePlatform = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que cambie la selección
    
    if (!window.confirm("¿Seguro que quieres eliminar esta plataforma permanentemente?")) return

    setIsLoading(true)
    try {
      await deletePlatform(id)
      
      const newConfig = { ...config }
      delete newConfig[id]
      setConfig(newConfig)
      
      const remainingIds = Object.keys(newConfig)
      if (activePlatform === id) {
        if (remainingIds.length > 0) {
          setActivePlatform(remainingIds[0])
        } else {
          handleAddPlatform(true)
        }
      }
    } catch (err) {
      console.error("Error deleting platform:", err)
      alert("Error al eliminar la plataforma.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 text-indigo-400">
          <Loader2 className="animate-spin" size={48} />
          <p className="font-bold tracking-widest uppercase">Cargando Plataformas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-[85vh] bg-[#0f172a] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Sidebar - Platform List */}
        <div className="hidden md:flex flex-col w-72 bg-slate-900/80 border-r border-white/5 relative">
          <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="text-indigo-400" size={20} />
              Ajustes Base
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configuración por defecto</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {Object.values(config).map((platform) => (
              <button
                key={platform.id}
                onClick={() => setActivePlatform(platform.id)}
                className={`w-full group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer ${
                  activePlatform === platform.id
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-xl flex items-center justify-center flex-shrink-0 w-9 h-9 ${activePlatform === platform.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    {platform.iconImage ? (
                      <img src={platform.iconImage} alt={platform.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2224%22 height%3D%2224%22%3E%3Cpath fill%3D%22currentColor%22 d%3D%22M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z%22%2F%3E%3C%2Fsvg%3E' }} />
                    ) : (
                      <Gamepad2 size={18} />
                    )}
                  </div>
                  <span className="truncate text-left text-sm">{platform.name || platform.id}</span>
                </div>
                
                <div 
                  className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all ${
                    activePlatform === platform.id ? 'text-indigo-300' : 'text-slate-500'
                  }`}
                  onClick={(e) => handleDeletePlatform(platform.id, e)}
                  title="Eliminar Plataforma"
                >
                  <Trash2 size={14} />
                </div>
              </button>
            ))}
          </div>
          
          {/* Botón Añadir Plataforma */}
          <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
            <button 
              onClick={() => handleAddPlatform(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/50 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 border border-slate-700/50 hover:border-indigo-500/30 transition-all font-bold shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={18} /> Añadir Plataforma
            </button>
          </div>
        </div>

        {/* Right Content - Form */}
        <div className="flex-1 flex flex-col relative bg-[#0f172a]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white truncate max-w-sm">
                  {config[activePlatform]?.name || 'Plataforma'}
                </h2>
                <p className="text-xs text-indigo-400 font-semibold tracking-wide uppercase">Valores por defecto</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              {config[activePlatform] && (
                <SettingsForm 
                  platformId={activePlatform} 
                  config={config} 
                  onChange={handleConfigChange} 
                />
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md sticky bottom-0 z-20 flex justify-end items-center gap-4">
            {saved && (
              <span className="text-emerald-400 flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-right-4">
                <CheckCircle2 size={18} />
                Guardado con éxito
              </span>
            )}
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Cerrar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-50 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] active:scale-95 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
