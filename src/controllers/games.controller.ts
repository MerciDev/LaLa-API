import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Game } from '../types/game.types';

const GAMES_DIR = path.join(__dirname, '../data/games');

// Helper to get all games (use with caution if dataset grows huge)
const loadAllGames = (): Game[] => {
    if (!fs.existsSync(GAMES_DIR)) return [];

    const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
    let allGames: Game[] = [];

    for (const file of files) {
        const data = fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8');
        try {
            allGames = allGames.concat(JSON.parse(data));
        } catch (e) {
            console.error(`Error loading ${file}`);
        }
    }
    return allGames;
};

// Helper: Get games from specific letter (Optimization)
const loadGamesByLetter = (letter: string): Game[] => {
    const safeLetter = letter.toLowerCase();
    const filePath = path.join(GAMES_DIR, `${safeLetter}.json`);
    if (!fs.existsSync(filePath)) return [];

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return [];
    }
};

import { optimizeAndSaveImage } from '../services/image.service';

// ... (existing helper functions)

export const saveGame = async (req: Request, res: Response) => {
    try {
        const gameData: Game = req.body;

        if (!gameData.id || !gameData.name) {
            res.status(400).json({ error: 'ID and Name are required' });
            return;
        }

        // Process images: Download & Optimize if they are URLs
        if (gameData.images) {
            const imageKeys = ['cover', 'background', 'square', 'vertical', 'horizontal', 'logo', 'icon'];

            for (const type of imageKeys) {
                // @ts-ignore - access dynamic key
                const currentUrl = gameData.images[type] as string;
                if (currentUrl && currentUrl.startsWith('http') && !currentUrl.includes('localhost')) {
                    try {
                        console.log(`Processing image ${type} for ${gameData.id}...`);
                        const localPath = await optimizeAndSaveImage(currentUrl, gameData.id, type);
                        // @ts-ignore
                        gameData.images[type] = localPath;
                    } catch (err) {
                        console.error(`Failed to optimize ${type} for ${gameData.id}:`, err);
                        // Keep original URL on failure or handle otherwise
                    }
                }
            }
        }

        const letter = gameData.id.charAt(0).toLowerCase();
        const shardPath = path.join(GAMES_DIR, `${letter}.json`);

        // 1. Load Shard
        let shardGames: Game[] = [];
        if (fs.existsSync(shardPath)) {
            try {
                shardGames = JSON.parse(fs.readFileSync(shardPath, 'utf-8'));
            } catch (e) {
                shardGames = [];
            }
        }

        // 3. Update or Add
        const existingIndex = shardGames.findIndex(g => g.id === gameData.id);
        if (existingIndex >= 0) {
            shardGames[existingIndex] = { ...shardGames[existingIndex], ...gameData };
        } else {
            shardGames.push(gameData);
        }

        // 4. Save Shard
        // Ensure dir exists just in case
        if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR, { recursive: true });

        fs.writeFileSync(shardPath, JSON.stringify(shardGames, null, 2));

        res.json({ message: 'Game saved successfully', game: gameData });

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const searchGames = (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;

        if (!query) {
            // If no query is provided, return all games (or a limited set) instead of erroring
            // This is useful for initial load if the frontend is blindly fetching with empty query
            const games = loadAllGames();
            const results = games.slice(0, 50).map(game => ({
                id: game.id,
                name: game.name,
                console: game.console,
                releaseDate: game.releaseDate,
                platforms: game.platforms, // Include platforms
                images: game.images
            }));
            res.json({ results });
            return;
        }

        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const searchTerm = normalize(query);

        const games = loadAllGames();

        const results = games.filter(game =>
            normalize(game.name).includes(searchTerm) || 
            normalize(game.id).includes(searchTerm)
        ).map(game => ({
            id: game.id,
            name: game.name,
            console: game.console,
            releaseDate: game.releaseDate,
            platforms: game.platforms, // Include platforms
            images: game.images
        }));

        res.json({ results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getGameById = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'ID required' });
            return;
        }

        const firstChar = id.charAt(0).toLowerCase();

        // Smart Load: Only load the file that SHOULD contain this ID
        const shardGames = loadGamesByLetter(firstChar);
        const game = shardGames.find(g => g.id === id);

        if (!game) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        res.json(game);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteGame = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'ID required' });
            return;
        }

        const letter = id.charAt(0).toLowerCase();
        const shardPath = path.join(GAMES_DIR, `${letter}.json`);

        if (!fs.existsSync(shardPath)) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        let shardGames: Game[] = [];
        try {
            shardGames = JSON.parse(fs.readFileSync(shardPath, 'utf-8'));
        } catch (e) {
            shardGames = [];
        }

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
