import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Game } from '../types/game.types';
import { optimizeAndSaveImage } from '../services/image.service';
import { getSupabase, isSupabaseConfigured } from '../services/supabase.service';

const GAMES_DIR = path.join(__dirname, '../data/games');

// ---- Helpers (fallback local) ----
const loadAllGames = (): Game[] => {
  if (!fs.existsSync(GAMES_DIR)) return [];
  const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
  let allGames: Game[] = [];
  for (const file of files) {
    try {
      allGames = allGames.concat(JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8')));
    } catch { /* skip */ }
  }
  return allGames;
};

const loadGamesByLetter = (letter: string): Game[] => {
  const safeLetter = letter.toLowerCase();
  const filePath = path.join(GAMES_DIR, `${safeLetter}.json`);
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return []; }
};

// ---- Supabase helpers ----
function flattenGame(row: any): Game {
  return { id: row.id, name: row.name, ...(row.data || {}) };
}

function trimGameData(gameData: Game) {
  const { id, name, console, releaseDate, platforms, tags, description, images, externalIds } = gameData;
  return { id, name, data: { console, releaseDate, platforms, tags, description, images, externalIds } };
}

// ---- Controllers ----
export const searchGames = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();

    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      let sbQuery = sb.from('games').select('*').order('name');

      if (query) {
        sbQuery = sbQuery.ilike('name', `%${query.replace(/%/g, '\\%')}%`);
      }

      const { data, error } = await sbQuery.limit(50);

      if (!error && data) {
        const results = data.map(flattenGame).map(g => ({
          id: g.id,
          name: g.name,
          console: g.console,
          releaseDate: g.releaseDate,
          platforms: g.platforms,
          images: g.images
        }));
        res.json({ results });
        return;
      }
      console.error('[Supabase] searchGames error:', error);
      // fall through to local
    }

    // Local fallback
    const games = loadAllGames();
    if (!query) {
      res.json({ results: games.slice(0, 50).map(g => ({ id: g.id, name: g.name, console: g.console, releaseDate: g.releaseDate, platforms: g.platforms, images: g.images })) });
      return;
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchTerm = normalize(query);
    const results = games.filter(g => normalize(g.name).includes(searchTerm) || normalize(g.id).includes(searchTerm))
      .map(g => ({ id: g.id, name: g.name, console: g.console, releaseDate: g.releaseDate, platforms: g.platforms, images: g.images }));
    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGameById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: 'ID required' }); return; }

    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      const { data, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();

      if (!error && data) {
        res.json(flattenGame(data));
        return;
      }
      // fall through
    }

    const firstChar = id.charAt(0).toLowerCase();
    const games = loadGamesByLetter(firstChar);
    const game = games.find(g => g.id === id);
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveGame = async (req: Request, res: Response) => {
  try {
    const gameData: Game = req.body;
    if (!gameData.id || !gameData.name) {
      res.status(400).json({ error: 'ID and Name are required' });
      return;
    }

    // Process images: download & optimize remote URLs
    if (gameData.images) {
      const imageKeys = ['cover', 'background', 'square', 'vertical', 'horizontal', 'logo', 'icon'];
      for (const type of imageKeys) {
        const currentUrl = (gameData.images as any)[type] as string;
        if (currentUrl && currentUrl.startsWith('http') && !currentUrl.includes('localhost')) {
          try {
            console.log(`Processing image ${type} for ${gameData.id}...`);
            const localPath = await optimizeAndSaveImage(currentUrl, gameData.id, type);
            (gameData.images as any)[type] = localPath;
          } catch (err) {
            console.error(`Failed to optimize ${type} for ${gameData.id}:`, err);
          }
        }
      }
    }

    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      const upsertData = trimGameData(gameData);
      const { error } = await sb.from('games').upsert(upsertData, { onConflict: 'id' });

      if (!error) {
        console.log(`[Supabase] Game saved: ${gameData.id}`);
        res.json({ message: 'Game saved successfully', game: gameData });
        return;
      }
      console.error('[Supabase] saveGame error:', error);
    }

    // Local fallback
    const letter = gameData.id.charAt(0).toLowerCase();
    const shardPath = path.join(GAMES_DIR, `${letter}.json`);

    let shardGames: Game[] = [];
    if (fs.existsSync(shardPath)) {
      try { shardGames = JSON.parse(fs.readFileSync(shardPath, 'utf-8')); } catch { shardGames = []; }
    }

    const existingIndex = shardGames.findIndex(g => g.id === gameData.id);
    if (existingIndex >= 0) {
      shardGames[existingIndex] = { ...shardGames[existingIndex], ...gameData };
    } else {
      shardGames.push(gameData);
    }

    if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR, { recursive: true });
    fs.writeFileSync(shardPath, JSON.stringify(shardGames, null, 2));
    res.json({ message: 'Game saved successfully', game: gameData });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getYears = async (req: Request, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      const { data, error } = await sb.from('games').select('data->>releaseDate');

      if (!error && data) {
        const years = new Set<string>();
        for (const row of data) {
          const date = (row as any).releaseDate;
          if (date) {
            const year = new Date(date).getFullYear();
            if (!isNaN(year)) years.add(year.toString());
          }
        }
        res.json(Array.from(years).sort((a, b) => b.localeCompare(a)));
        return;
      }
    }

    const games = loadAllGames();
    const years = new Set<string>();
    for (const game of games) {
      if (game.releaseDate) {
        const year = new Date(game.releaseDate).getFullYear();
        if (!isNaN(year)) years.add(year.toString());
      }
    }
    res.json(Array.from(years).sort((a, b) => b.localeCompare(a)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: 'ID required' }); return; }

    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      const { error } = await sb.from('games').delete().eq('id', id);

      if (!error) {
        console.log(`[Supabase] Game deleted: ${id}`);
        res.json({ message: 'Game deleted successfully' });
        return;
      }
      console.error('[Supabase] deleteGame error:', error);
    }

    // Local fallback
    const letter = id.charAt(0).toLowerCase();
    const shardPath = path.join(GAMES_DIR, `${letter}.json`);

    if (!fs.existsSync(shardPath)) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    let shardGames: Game[] = [];
    try { shardGames = JSON.parse(fs.readFileSync(shardPath, 'utf-8')); } catch { shardGames = []; }

    const newGames = shardGames.filter(g => g.id !== id);
    if (newGames.length === shardGames.length) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    fs.writeFileSync(shardPath, JSON.stringify(newGames, null, 2));
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
