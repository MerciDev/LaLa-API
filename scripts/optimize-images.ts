import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const TARGET_WIDTH = 600;
const QUALITY = 80;
const DATA_DIR = path.join(__dirname, '../src/data/games'); // Now looking at the folder
const PUBLIC_DIR = path.join(__dirname, '../public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images/optimized');

if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}. Run migration first.`);
    process.exit(1);
}

interface Game {
    id: string;
    images?: {
        cover?: string;
        screenshots?: string[];
    };
}

const downloadAndOptimize = async (urlOrPath: string, filename: string, letter: string, force = false): Promise<string | null> => {
    // Structure: public/images/optimized/[z]/[game-id]-cover.webp
    const subDir = path.join(IMAGES_DIR, letter);
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    const outputPath = path.join(subDir, `${filename}.webp`);
    const publicPath = `/images/optimized/${letter}/${filename}.webp`;

    if (fs.existsSync(outputPath) && !force) {
        console.log(`✅ [SKIP] ${filename} already optimized.`);
        return publicPath;
    }

    try {
        let inputBuffer: Buffer;

        if (urlOrPath.startsWith('http')) {
            console.log(`⬇️  Downloading ${filename} (to ${letter}/)...`);
            const response = await axios.get(urlOrPath, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0...' }
            });
            inputBuffer = Buffer.from(response.data);
        } else {
            // Local file logic
            // If it's already in the right place, skip
            if (urlOrPath === publicPath && !force) return publicPath;

            const localPath = path.join(PUBLIC_DIR, urlOrPath);
            if (fs.existsSync(localPath)) {
                inputBuffer = fs.readFileSync(localPath);
            } else {
                console.warn(`⚠️  Source not found: ${urlOrPath}`);
                return null;
            }
        }

        console.log(`⚙️  Optimizing ${filename}...`);
        await sharp(inputBuffer)
            .resize(TARGET_WIDTH)
            .webp({ quality: QUALITY })
            .toFile(outputPath);

        console.log(`✨ Done: ${filename}`);
        return publicPath;

    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
        return null;
    }
};

const main = async () => {
    // Read ALL files in src/data/games/*.json
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    console.log(`🚀 Scanning ${files.length} shard files for image updates...`);

    let totalChanged = 0;

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        let games: Game[];
        try {
            games = JSON.parse(rawData);
        } catch (e) {
            console.error(`Error parsing ${file}, skipping.`);
            continue;
        }

        let fileChanged = false;

        const imageKeys = ['cover', 'background', 'square', 'vertical', 'horizontal', 'logo', 'icon'];
        
        for (const game of games) {
            if (!game.images) continue;

            for (const type of imageKeys) {
                // @ts-ignore
                const currentUrl = game.images[type];
                if (!currentUrl) continue;

                const letter = game.id.charAt(0).toLowerCase();
                const expectedFilename = `${game.id}-${type}`;
                const expectedPath = `/images/optimized/${letter}/${expectedFilename}.webp`;

                // Logic: Check for HTTP URL or path mismatch
                if (currentUrl.startsWith('http')) {
                    console.log(`🔄 New URL detected for ${game.id} (${type})...`);
                    const newPath = await downloadAndOptimize(currentUrl, expectedFilename, letter, true);
                    if (newPath) {
                        // @ts-ignore
                        game.images[type] = newPath;
                        fileChanged = true;
                    }
                } else if (!currentUrl.startsWith('/images/optimized') || currentUrl !== expectedPath) {
                   // Optional: Fix mismatch if it points to an unoptimized local file or old path
                   // For now, let's just focus on if it's NOT the expected path and looks like a raw file
                   if (currentUrl.startsWith('/images/optimized')) {
                        // If it's already optimized but maybe with a different name or path?
                        // If it matches exactly expectedPath, we are good. 
                        // If not, we might want to check existence.
                        // For simplicity, let's keep the user's focus which is "downloading" new http images.
                        continue; 
                   }

                   // If it's a local path that isn't the target path, try to optimize it
                    console.log(`📦 Format mismatch for ${game.id} (${type}). Fixing...`);
                    const newPath = await downloadAndOptimize(currentUrl, expectedFilename, letter, true);
                    if (newPath) {
                        // @ts-ignore
                        game.images[type] = newPath;
                        fileChanged = true;
                    }
                }
            }
        }

        if (fileChanged) {
            fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
            console.log(`💾 Updated ${file}`);
            totalChanged++;
        }
    }

    if (totalChanged === 0) {
        console.log('👍 All files up to date.');
    } else {
        console.log(`✅ Updated ${totalChanged} files.`);
    }
};

main();
