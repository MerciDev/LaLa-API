import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Paths relative to src/services
const PUBLIC_DIR = path.join(__dirname, '../../public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images/optimized');
const TARGET_WIDTH = 600;
const THUMB_WIDTH = 250;
const QUALITY = 85; 
const THUMB_QUALITY = 70;

export const optimizeAndSaveImage = async (
    input: Buffer | string,
    gameId: string,
    type: string
): Promise<string> => {
    // Sanitize
    const safeId = gameId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const safeType = type.toLowerCase();

    // 1. Determine Folder and Filename
    // Rule: public/images/optimized/[first-letter]/[game-id]-[type].webp
    const letter = safeId.charAt(0) || '0';
    const subDir = path.join(IMAGES_DIR, letter);

    if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
    }

    const filename = `${safeId}-${safeType}`;
    const outputPath = path.join(subDir, `${filename}.webp`);
    const publicPath = `/images/optimized/${letter}/${filename}.webp`;

    let inputBuffer: Buffer;

    // 2. Get Buffer
    try {
        if (Buffer.isBuffer(input)) {
            inputBuffer = input;
        } else if (typeof input === 'string' && input.startsWith('http')) {
            const response = await axios.get(input, { responseType: 'arraybuffer' });
            inputBuffer = Buffer.from(response.data);
        } else if (typeof input === 'string') {
            // Local file path
            const localPath = path.isAbsolute(input) ? input : path.join(PUBLIC_DIR, input);
            if (fs.existsSync(localPath)) {
                inputBuffer = fs.readFileSync(localPath);
            } else {
                throw new Error(`File not found: ${input}`);
            }
        } else {
            throw new Error('Invalid input type');
        }

        const thumbFilename = `${safeId}-${safeType}-thumb.webp`;
        const thumbOutputPath = path.join(subDir, thumbFilename);

        // 3. Process Full Version
        await sharp(inputBuffer)
            .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(outputPath);

        // 4. Process Thumbnail Version
        await sharp(inputBuffer)
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: THUMB_QUALITY })
            .toFile(thumbOutputPath);

        return publicPath; // We still return the main path, but the -thumb version now exists on disk.
    } catch (error) {
        console.error("Image optimization error:", error);
        throw error;
    }
};
