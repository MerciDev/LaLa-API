import { useState, useEffect } from 'react'
import { Folder, Play, FileCode, Monitor, ToggleLeft, ToggleRight, Info, Plus, Trash2, Cpu, Check, Image as ImageIcon, Hash, Gamepad2, Calendar, Download, Type } from 'lucide-react'

export interface AppConfig {
  id: string
  name: string
  executablePath: string
  args: string
  downloadUrl?: string
  useRetroarch: boolean
}

export interface PlatformConfig {
  id: string
  name: string
  abbreviation?: string
  nameImage?: string
  image?: string
  releaseDate?: string
  romPath: string
  biosPath?: string
  enableRichPresence: boolean
  consoleImage?: string
  iconImage?: string
  defaultAppId: string
  apps: AppConfig[]
}

interface SettingsFormProps {
  platformId: string
  config: Record<string, PlatformConfig>
  onChange: (updatedPlatform: PlatformConfig) => void
}

export default function SettingsForm({ platformId, config, onChange }: SettingsFormProps) {
  const current = config[platformId]
  
  // Usar el defaultAppId o el primero disponible, si no mantener estado local si la app existe
  const [activeAppId, setActiveAppId] = useState<string>(current?.apps?.[0]?.id || '')

  useEffect(() => {
    if (current && !current.apps.find(a => a.id === activeAppId)) {
      setActiveAppId(current.defaultAppId || current.apps[0]?.id || '')
    }
  }, [platformId, current])

  if (!current) return null

  const handleChange = (key: keyof PlatformConfig, value: any) => {
    onChange({ ...current, [key]: value })
  }

  const handleAppChange = (appId: string, key: keyof AppConfig, value: any) => {
    const updatedApps = current.apps.map(app => 
      app.id === appId ? { ...app, [key]: value } : app
    )
    onChange({ ...current, apps: updatedApps })
  }

  const handleAddApp = () => {
    const newId = `app_${Date.now()}`
    const newApp: AppConfig = {
      id: newId,
      name: 'Nueva Aplicación',
      executablePath: '',
      args: '',
      downloadUrl: '',
      useRetroarch: false
    }
    const updatedApps = [...current.apps, newApp]
    onChange({ ...current, apps: updatedApps })
    setActiveAppId(newId)
  }

  const handleDeleteApp = (appId: string) => {
    if (current.apps.length <= 1) return // No dejar vacío
    
    const updatedApps = current.apps.filter(app => app.id !== appId)
    const newDefault = current.defaultAppId === appId ? updatedApps[0].id : current.defaultAppId
    
    onChange({ ...current, apps: updatedApps, defaultAppId: newDefault })
    if (activeAppId === appId) setActiveAppId(updatedApps[0].id)
  }

  const activeApp = current.apps.find(a => a.id === activeAppId) || current.apps[0]

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      {/* Identificación de Plataforma */}
      <div className="space-y-5">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2 flex items-center gap-2">
          <Gamepad2 size={16} /> Identificación
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              ID Único
            </label>
            <div className="relative group">
              <Hash className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                placeholder="Ej. ps2, switch, snes..."
                value={current.id || ''}
                onChange={e => handleChange('id', e.target.value)}
              />
            </div>
            <p className="text-[10px] text-slate-500 ml-1">Usado internamente para identificar la plataforma.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Nombre Visible
            </label>
            <div className="relative group">
              <Gamepad2 className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-white font-bold focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                placeholder="Ej. PlayStation 2"
                value={current.name || ''}
                onChange={e => handleChange('name', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Abreviatura
            </label>
            <div className="relative group">
              <Type className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                placeholder="Ej. PS2, NSW, GBA..."
                value={current.abbreviation || ''}
                onChange={e => handleChange('abbreviation', e.target.value)}
              />
            </div>
            <p className="text-[10px] text-slate-500 ml-1">Para espacios reducidos.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Fecha de Lanzamiento
            </label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="date"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner [color-scheme:dark]"
                value={current.releaseDate || ''}
                onChange={e => handleChange('releaseDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center justify-between">
              Imagen del Nombre (Text Logo)
              {current.nameImage && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Preview</span>}
            </label>
            <div className="flex gap-3">
              <div className="relative group flex-1">
                <ImageIcon className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                  placeholder="URL de la imagen del texto (ej. text-logo.png)"
                  value={current.nameImage || ''}
                  onChange={e => handleChange('nameImage', e.target.value)}
                />
              </div>
              {current.nameImage && (
                <div className="w-32 h-12 rounded-xl bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                  <img src={current.nameImage} alt="Nombre" className="max-w-full max-h-full object-contain p-2" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2220%22 dy%3D%227%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ajustes Generales de Plataforma */}
      <div className="space-y-5">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2 flex items-center gap-2">
          <Folder size={16} /> Base de Plataforma
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Directorio de ROMs / Juegos (Raíz)
            </label>
            <div className="relative group">
              <Folder className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                placeholder="Ej. C:\Roms\PS2"
                value={current.romPath}
                onChange={e => handleChange('romPath', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Directorio de BIOS
            </label>
            <div className="relative group">
              <Folder className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                placeholder="Ej. C:\Emulators\RetroArch\system"
                value={current.biosPath || ''}
                onChange={e => handleChange('biosPath', e.target.value)}
              />
            </div>
            <p className="text-[10px] text-slate-500 ml-1">Opcional. Déjalo vacío si no requiere BIOS dedicada.</p>
          </div>

          <div 
            onClick={() => handleChange('enableRichPresence', !current.enableRichPresence)}
            className={`col-span-1 md:col-span-2 p-3 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between ${
              current.enableRichPresence 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
            }`}
          >
            <div>
              <h4 className={`text-sm font-bold ${current.enableRichPresence ? 'text-indigo-400' : 'text-slate-300'}`}>
                Discord Rich Presence
              </h4>
              <p className="text-[10px] text-slate-500 mt-1">
                Muestra la actividad en Discord.
              </p>
            </div>
            {current.enableRichPresence ? (
              <ToggleRight className="text-indigo-500" size={28} />
            ) : (
              <ToggleLeft className="text-slate-600" size={28} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Console Image */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center justify-between">
              Imagen de la Consola
              {current.consoleImage && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Preview</span>}
            </label>
            <div className="flex gap-3">
              <div className="relative group flex-1">
                <ImageIcon className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                  placeholder="URL de la imagen (ej. consola.png)"
                  value={current.consoleImage || ''}
                  onChange={e => handleChange('consoleImage', e.target.value)}
                />
              </div>
              {current.consoleImage && (
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden shadow-inner">
                  <img src={current.consoleImage} alt="Consola" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                </div>
              )}
            </div>
          </div>

          {/* Background Image */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center justify-between">
              Fondo de la Plataforma (Background)
              {current.image && <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">Preview</span>}
            </label>
            <div className="flex gap-3">
              <div className="relative group flex-1">
                <ImageIcon className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-teal-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                  placeholder="URL del fondo (ej. background.jpg)"
                  value={current.image || ''}
                  onChange={e => handleChange('image', e.target.value)}
                />
              </div>
              {current.image && (
                <div className="w-24 h-12 rounded-xl bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden shadow-inner">
                  <img src={current.image} alt="Background" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                </div>
              )}
            </div>
          </div>

          {/* Icon Image */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center justify-between">
              Icono de la Plataforma
              {current.iconImage && <span className="text-[10px] text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded">Preview</span>}
            </label>
            <div className="flex gap-3">
              <div className="relative group flex-1">
                <ImageIcon className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors" size={18} />
                <input 
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-fuchsia-500 focus:bg-slate-800 outline-none transition-all shadow-inner"
                  placeholder="URL del icono (ej. icono.png)"
                  value={current.iconImage || ''}
                  onChange={e => handleChange('iconImage', e.target.value)}
                />
              </div>
              {current.iconImage && (
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden shadow-inner">
                  <img src={current.iconImage} alt="Icon" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aplicaciones Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-2">
          <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} /> Aplicaciones / Emuladores
          </h3>
          <button 
            onClick={handleAddApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 text-xs font-bold rounded-lg border border-fuchsia-500/30 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Nueva App
          </button>
        </div>
        
        {/* Pestañas de Apps */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {current.apps.map(app => (
            <button
              key={app.id}
              onClick={() => setActiveAppId(app.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeAppId === app.id
                  ? 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/50 text-fuchsia-300 shadow-lg shadow-fuchsia-500/10'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {app.name}
              {current.defaultAppId === app.id && (
                <Check size={14} className="text-emerald-400" title="Aplicación por Defecto" />
              )}
            </button>
          ))}
        </div>

        {/* Formulario de la App Activa */}
        {activeApp && (
          <div className="p-6 rounded-2xl border border-fuchsia-500/20 bg-slate-800/20 relative">
            <div className="absolute top-4 right-4 flex items-center gap-3">
              {current.defaultAppId !== activeApp.id && (
                <button 
                  onClick={() => handleChange('defaultAppId', activeApp.id)}
                  className="text-xs text-emerald-400/80 hover:text-emerald-400 font-bold px-3 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 transition-colors cursor-pointer"
                >
                  Marcar por defecto
                </button>
              )}
              {current.apps.length > 1 && (
                <button 
                  onClick={() => handleDeleteApp(activeApp.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Eliminar Aplicación"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-6 mt-4">
              <div className="space-y-2 max-w-sm">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Nombre de la App
                </label>
                <div className="relative group">
                  <Cpu className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors" size={18} />
                  <input 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-white focus:border-fuchsia-500 focus:bg-slate-900 outline-none transition-all shadow-inner"
                    value={activeApp.name}
                    onChange={e => handleAppChange(activeApp.id, 'name', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Ejecutable (.exe / path)
                  </label>
                  <div className="relative group">
                    <Play className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors" size={18} />
                    <input 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:border-fuchsia-500 focus:bg-slate-900 outline-none transition-all shadow-inner"
                      placeholder="Ej. C:\Emulators\app.exe"
                      value={activeApp.executablePath}
                      onChange={e => handleAppChange(activeApp.id, 'executablePath', e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 ml-1 flex items-center gap-1">
                    <Info size={12} /> Déjalo vacío si no requiere ejecutable externo
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Argumentos de Lanzamiento
                  </label>
                  <div className="relative group">
                    <Monitor className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors" size={18} />
                    <input 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 font-mono text-sm text-fuchsia-200 focus:border-fuchsia-500 focus:bg-slate-900 outline-none transition-all shadow-inner"
                      placeholder="Ej. --fullscreen -f"
                      value={activeApp.args}
                      onChange={e => handleAppChange(activeApp.id, 'args', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  URL de Descarga del Emulador
                </label>
                <div className="relative group">
                  <Download className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors" size={18} />
                  <input 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-fuchsia-200 focus:border-fuchsia-500 focus:bg-slate-900 outline-none transition-all shadow-inner"
                    placeholder="https://yuzu-emu.org/downloads"
                    value={activeApp.downloadUrl || ''}
                    onChange={e => handleAppChange(activeApp.id, 'downloadUrl', e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-500 ml-1 flex items-center gap-1">
                  <Info size={12} /> Útil para que otros usuarios puedan descargar e instalar este emulador.
                </p>
              </div>

              <div className="pt-4 border-t border-fuchsia-500/10">
                <div 
                  onClick={() => handleAppChange(activeApp.id, 'useRetroarch', !activeApp.useRetroarch)}
                  className={`max-w-sm p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between ${
                    activeApp.useRetroarch 
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/30' 
                      : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <h4 className={`text-sm font-bold ${activeApp.useRetroarch ? 'text-fuchsia-400' : 'text-slate-300'}`}>
                      Es un núcleo de RetroArch
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Indica que es un core (.dll) y no un standalone.
                    </p>
                  </div>
                  {activeApp.useRetroarch ? (
                    <ToggleRight className="text-fuchsia-500" size={32} />
                  ) : (
                    <ToggleLeft className="text-slate-600" size={32} />
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  )
}
