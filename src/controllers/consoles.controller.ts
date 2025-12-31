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
        const consoles = JSON.parse(data);

        // Sort alphabetically by name
        consoles.sort((a: any, b: any) => a.name.localeCompare(b.name));

        res.json(consoles);
    } catch (error) {
        console.error("Error loading consoles:", error);
        res.status(500).json({ error: 'Failed to load consoles' });
    }
};
