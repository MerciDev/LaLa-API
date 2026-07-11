import { getSupabaseClient } from './assets'
import type { PlatformConfig } from '../components/Settings/SettingsForm'

/**
 * Recupera todas las plataformas de la tabla `consoles`.
 * Devuelve un diccionario donde la key es el ID de la plataforma.
 */
export async function fetchPlatforms(): Promise<Record<string, PlatformConfig>> {
  const sb = getSupabaseClient()
  const { data, error } = await sb.from('consoles').select('*').order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching platforms:', error)
    throw error
  }

  const platforms: Record<string, PlatformConfig> = {}
  
  if (data) {
    for (const row of data) {
      // row.data contiene el resto de la configuración
      const config: PlatformConfig = {
        id: row.id,
        name: row.name,
        abbreviation: row.data.abbreviation || '',
        nameImage: row.data.nameImage || '',
        releaseDate: row.data.releaseDate || '',
        romPath: row.data.romPath || '',
        biosPath: row.data.biosPath || '',
        enableRichPresence: row.data.enableRichPresence ?? true,
        consoleImage: row.data.consoleImage || '',
        iconImage: row.data.iconImage || '',
        defaultAppId: row.data.defaultAppId || '',
        apps: row.data.apps || []
      }
      platforms[row.id] = config
    }
  }

  return platforms
}

/**
 * Guarda o actualiza una plataforma en la tabla `consoles`.
 */
export async function savePlatform(config: PlatformConfig): Promise<void> {
  const sb = getSupabaseClient()
  
  const record = {
    id: config.id,
    name: config.name,
    data: {
      abbreviation: config.abbreviation,
      nameImage: config.nameImage,
      releaseDate: config.releaseDate,
      romPath: config.romPath,
      biosPath: config.biosPath,
      enableRichPresence: config.enableRichPresence,
      consoleImage: config.consoleImage,
      iconImage: config.iconImage,
      defaultAppId: config.defaultAppId,
      apps: config.apps
    },
    updated_at: new Date().toISOString()
  }

  const { error } = await sb.from('consoles').upsert(record)
  
  if (error) {
    console.error('Error saving platform:', error)
    throw error
  }
}

/**
 * Elimina una plataforma de la base de datos por su ID.
 */
export async function deletePlatform(id: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from('consoles').delete().eq('id', id)
  
  if (error) {
    console.error('Error deleting platform:', error)
    throw error
  }
}
