import { Request, Response } from 'express';
import { optimizeAndSaveImage } from '../services/image.service';
import { getSupabase, isSupabaseConfigured } from '../services/supabase.service';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';

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

    // 1. Save locally (existing behavior)
    const localPath = await optimizeAndSaveImage(input, gameId, type);
    let imageUrl = localPath;

    // 2. Also upload to Supabase Storage if configured
    if (isSupabaseConfigured() && input) {
      try {
        const sb = getSupabase()!;
        const safeId = gameId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const safeType = type.toLowerCase();
        const letter = safeId.charAt(0) || '0';
        const filename = `${safeId}-${safeType}.webp`;
        const storagePath = `${letter}/${filename}`;

        // Get the processed buffer
        let buffer: Buffer;
        if (Buffer.isBuffer(input)) {
          buffer = await sharp(input)
            .resize({ width: 600, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        } else if (typeof input === 'string' && input.startsWith('http')) {
          const response = await axios.get(input, { responseType: 'arraybuffer' });
          buffer = await sharp(Buffer.from(response.data))
            .resize({ width: 600, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        } else {
          // Local file path
          const publicDir = path.join(__dirname, '../../public');
          const localFilePath = path.isAbsolute(input) ? input : path.join(publicDir, input);
          buffer = await sharp(fs.readFileSync(localFilePath))
            .resize({ width: 600, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        }

        const { error: uploadError } = await sb.storage
          .from('game-images')
          .upload(storagePath, buffer, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = sb.storage.from('game-images').getPublicUrl(storagePath);
          imageUrl = publicUrl;
          console.log(`[Supabase] Image uploaded: ${publicUrl}`);
        } else {
          console.error('[Supabase] Storage upload error:', uploadError);
        }
      } catch (storageErr) {
        console.error('[Supabase] Storage upload failed:', storageErr);
      }
    }

    res.json({ url: imageUrl, localUrl: localPath });
  } catch (error) {
    console.error("Upload controller error:", error);
    res.status(500).json({ error: 'Image processing failed' });
  }
};
