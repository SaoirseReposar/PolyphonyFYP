const db = require('../database');
const translationService = require('../services/translationService');

async function addLosPollitos() {
    try {
        console.log('Adding Los Pollitos Dicen...\n');
        
        const songResult = await db.query(
            `INSERT INTO songs (
                spotify_track_id, 
                title, 
                artist, 
                language, 
                difficulty, 
                duration_ms,
                album_art_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (spotify_track_id) DO UPDATE SET
                title = EXCLUDED.title,
                artist = EXCLUDED.artist,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id`,
            [
                '3vkq9XlqVqIxFPHCBLbLOF', 
                'Los Pollitos Dicen',
                'Ismael Parraguez',
                'spanish',
                'beginner',
                120000, 
                'images/spanish1.webp'
            ]
        );
        
        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);
        
        const lyrics = [
            { line: 1, time: 12, text: "Los pollitos dicen" },
            { line: 2, time: 14, text: "Pío, pío, pío" },
            { line: 3, time: 16, text: "Cuando tienen hambre" },
            { line: 4, time: 19, text: "Cuando tienen frío" },
            { line: 5, time: 21, text: "La gallina busca" },
            { line: 6, time: 23, text: "El maíz y el trigo" },
            { line: 7, time: 26, text: "Les da la comida" },
            { line: 8, time: 28, text: "Y les presta abrigo" },
            { line: 9, time: 30, text: "Bajo sus dos alas" },
            { line: 10, time: 33, text: "Acurrucaditos" },
            { line: 11, time: 35, text: "Hasta el otro día" },
            { line: 12, time: 38, text: "Duermen los pollitos" }
        ];
        
        console.log(`\nTranslating ${lyrics.length} lines from Spanish to English...`);
        
        const textsToTranslate = lyrics.map(l => l.text);
        const translations = await translationService.translateBatch(textsToTranslate, 'spanish', 'EN-US');
        
        console.log('✓ Translations received\n');
        
        for (let i = 0; i < lyrics.length; i++) {
            const lyric = lyrics[i];
            const translation = translations[i];
            const timestampMs = lyric.time * 1000; 
            
            await db.query(
                `INSERT INTO lyrics (
                    song_id, 
                    line_number, 
                    timestamp_ms, 
                    original_text, 
                    translated_text,
                    language_to
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (song_id, line_number) DO UPDATE SET
                    timestamp_ms = EXCLUDED.timestamp_ms,
                    original_text = EXCLUDED.original_text,
                    translated_text = EXCLUDED.translated_text`,
                [songId, lyric.line, timestampMs, lyric.text, translation, 'en']
            );
            
            console.log(`  Line ${lyric.line} @ ${lyric.time}s: "${lyric.text}" → "${translation}"`);
        }
        
        console.log('\nLos Pollitos Dicen setup complete!');
        console.log(`\nSong ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`\nTest at: http://localhost:3000/learn.html?id=${songId}`);
        
        process.exit(0);
    } catch (error) {
        console.error(' Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    addLosPollitos();
}

module.exports = addLosPollitos;