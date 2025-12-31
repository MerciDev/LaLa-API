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

        for (const game of games) {
            if (game.images?.cover) {
                const letter = game.id.charAt(0).toLowerCase(); // z
                const expectedFilename = `${game.id}-cover`;
                const expectedPath = `/images/optimized/${letter}/${expectedFilename}.webp`;

                // Check logic: URL or path mismatch (meaning migration or wrong location)
                if (game.images.cover.startsWith('http')) {
                    console.log(`🔄 New URL detected for ${game.id}...`);
                    const newPath = await downloadAndOptimize(game.images.cover, expectedFilename, letter, true);
                    if (newPath) {
                        game.images.cover = newPath;
                        fileChanged = true;
                    }
                } else if (game.images.cover !== expectedPath) {
                    console.log(`📦 Format mismatch for ${game.id}. Fixing...`);
                    const newPath = await downloadAndOptimize(game.images.cover, expectedFilename, letter, true);
                    if (newPath) {
                        game.images.cover = newPath;
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
