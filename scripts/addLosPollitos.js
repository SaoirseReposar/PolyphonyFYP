// scripts/addLosPollitos.js - Add Los Pollitos Dicen (song + lyrics)
const db = require('../database');
const translationService = require('../services/translationService');

async function addLosPollitos() {
    try {
        console.log('Adding Los Pollitos Dicen...\n');
        
        // Step 1: Add or update song
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
                '3vkq9XlqVqIxFPHCBLbLOF', // Replace with actual Spotify track ID if different
                'Los Pollitos Dicen',
                'Ismael Parraguez',
                'spanish',
                'beginner',
                120000, // 2 minutes
                null // Add album art URL if you have one
            ]
        );
        
        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);
        
        // Step 2: Define timestamped lyrics (in milliseconds)
        const lyrics = [
            
    { time: 12, text: "Los pollitos dicen", translation: "The little chicks say" },
    { time: 14, text: "Pío, pío, pío", translation: "Peep, peep, peep" },
    { time: 17, text: "Cuando tienen hambre", translation: "When they are hungry" },
    { time: 20, text: "Cuando tienen frío", translation: "When they are cold" },
    { time: 24, text: "La gallina busca", translation: "The hen looks for" },
    { time: 27, text: "El maíz y el trigo", translation: "Corn and wheat" },
    { time: 30, text: "Les da la comida", translation: "She gives them food" },
    { time: 33, text: "Y les presta abrigo", translation: "And gives them shelter" },
    { time: 37, text: "Bajo sus dos alas", translation: "Under her two wings" },
    { time: 40, text: "Acurrucaditos", translation: "Snuggled up" },
    { time: 43, text: "Hasta el otro día", translation: "Until the next day" },
    { time: 46, text: "Duermen los pollitos", translation: "The little chicks sleep" }
];

     
        
        console.log(`\nTranslating ${lyrics.length} lines from Spanish to English...`);
        
        // Step 3: Translate all lyrics in batch (more efficient)
        const textsToTranslate = lyrics.map(l => l.text);
        const translations = await translationService.translateBatch(textsToTranslate, 'spanish', 'EN-US');
        
        console.log('✓ Translations received\n');
        
        // Step 4: Insert lyrics with translations
        for (let i = 0; i < lyrics.length; i++) {
            const lyric = lyrics[i];
            const translation = translations[i];
            
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
                [songId, lyric.line, lyric.time, lyric.text, translation, 'en']
            );
            
            console.log(`  Line ${lyric.line}: "${lyric.text}" → "${translation}"`);
        }
        
        console.log('\n✅ Los Pollitos Dicen setup complete!');
        console.log(`\nSong ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`\nTest at: http://localhost:3000/learn.html?id=${songId}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    addLosPollitos();
}

module.exports = addLosPollitos;