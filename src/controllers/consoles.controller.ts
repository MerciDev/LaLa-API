import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const CONSOLES_PATH = path.join(__dirname, '../data/consoles.json');

export const getConsoles = (req: Request, res: Response) => {
    try {
        if (!fs.existsSync(CONSOLES_PATH)) {
            res.json([]);
            return;
        }
        const data = fs.readFileSync(CONSOLES_PATH, 'utf-8');
        let consoles = JSON.parse(data);

        const hasGamesQuery = req.query.hasGames === 'true';

        if (hasGamesQuery) {
            // Load all games to see which console IDs are actually used
            const GAMES_DIR = path.join(__dirname, '../data/games');
            if (fs.existsSync(GAMES_DIR)) {
                const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
                const usedConsoleIds = new Set<string>();

                for (const file of files) {
                    try {
                        const gamesData = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8'));
                        for (const game of gamesData) {
                            // Check primary console (could be string or object)
                            const primary = typeof game.console === 'string' ? game.console : game.console?.id;
                            if (primary) usedConsoleIds.add(primary.toLowerCase());

                            // Check platforms array as well
                            if (Array.isArray(game.platforms)) {
                                for (const p of game.platforms) {
                                    const pId = typeof p.console === 'string' ? p.console : p.console?.id;
                                    if (pId) usedConsoleIds.add(pId.toLowerCase());
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error loading shard ${file}`);
                    }
                }
                consoles = consoles.filter((c: any) => usedConsoleIds.has(c.id.toLowerCase()));
            }
        }

        // Sort alphabetically by name
        consoles.sort((a: any, b: any) => a.name.localeCompare(b.name));

        res.json(consoles);
    } catch (error) {
        console.error("Error loading consoles:", error);
        res.status(500).json({ error: 'Failed to load consoles' });
    }
};
