import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getSupabase, isSupabaseConfigured } from '../services/supabase.service';

const CONSOLES_PATH = path.join(__dirname, '../data/consoles.json');

function flattenConsole(row: any): any {
  return { id: row.id, name: row.name, ...(row.data || {}) };
}

export const getConsoles = async (req: Request, res: Response) => {
  try {
    const hasGamesQuery = req.query.hasGames === 'true';

    if (isSupabaseConfigured()) {
      const sb = getSupabase()!;
      const { data, error } = await sb.from('consoles').select('*').order('name');

      if (!error && data) {
        let consoles = data.map(flattenConsole);

        if (hasGamesQuery) {
          const { data: gamesData } = await sb.from('games').select('data->>console, data->>platforms');

          const usedConsoleIds = new Set<string>();
          if (gamesData) {
            for (const g of gamesData) {
              const gAny = g as any;
              const primary = typeof gAny.console === 'string' ? gAny.console : null;
              if (primary) usedConsoleIds.add(primary.toLowerCase());
              if (Array.isArray(gAny.platforms)) {
                for (const p of gAny.platforms) {
                  const pId = typeof p.console === 'string' ? p.console : p.console?.id;
                  if (pId) usedConsoleIds.add(pId.toLowerCase());
                }
              }
            }
          }
          consoles = consoles.filter((c: any) => usedConsoleIds.has(c.id.toLowerCase()));
        }

        consoles.sort((a: any, b: any) => a.name.localeCompare(b.name));
        res.json(consoles);
        return;
      }
      console.error('[Supabase] getConsoles error:', error);
    }

    // Local fallback
    if (!fs.existsSync(CONSOLES_PATH)) {
      res.json([]);
      return;
    }

    const raw = fs.readFileSync(CONSOLES_PATH, 'utf-8');
    let consoles = JSON.parse(raw);

    if (hasGamesQuery) {
      const GAMES_DIR = path.join(__dirname, '../data/games');
      if (fs.existsSync(GAMES_DIR)) {
        const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
        const usedConsoleIds = new Set<string>();

        for (const file of files) {
          try {
            const gamesData = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8'));
            for (const game of gamesData) {
              const primary = typeof game.console === 'string' ? game.console : game.console?.id;
              if (primary) usedConsoleIds.add(primary.toLowerCase());

              if (Array.isArray(game.platforms)) {
                for (const p of game.platforms) {
                  const pId = typeof p.console === 'string' ? p.console : p.console?.id;
                  if (pId) usedConsoleIds.add(pId.toLowerCase());
                }
              }
            }
          } catch { /* skip */ }
        }
        consoles = consoles.filter((c: any) => usedConsoleIds.has(c.id.toLowerCase()));
      }
    }

    consoles.sort((a: any, b: any) => a.name.localeCompare(b.name));
    res.json(consoles);
  } catch (error) {
    console.error("Error loading consoles:", error);
    res.status(500).json({ error: 'Failed to load consoles' });
  }
};
