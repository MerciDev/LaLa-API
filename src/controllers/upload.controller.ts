import { Request, Response } from 'express';
import { optimizeAndSaveImage } from '../services/image.service';

export const uploadImage = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const { gameId, type } = req.body;

        if (!gameId || !type) {
            res.status(400).json({ error: 'Missing gameId or type' });
            return;
        }

        let input: Buffer | string | undefined;
        if (file) {
            input = file.buffer;
        } else if (req.body.url) {
            input = req.body.url;
        }

        if (!input) {
            res.status(400).json({ error: 'No file or URL provided' });
            return;
        }

        const publicPath = await optimizeAndSaveImage(input, gameId, type);

        res.json({ url: publicPath });
    } catch (error) {
        console.error("Upload controller error:", error);
        res.status(500).json({ error: 'Image processing failed' });
    }
};
