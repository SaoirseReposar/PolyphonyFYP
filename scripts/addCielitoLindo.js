const db = require('../database');
const translationService = require('../services/translationService');

async function addCielitoLindo() {
    try {
        console.log('Adding Cielito Lindo...\n');
        
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
                album_art_url = EXCLUDED.album_art_url,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id`,
            [
                '4iqlR8DgqVO7leJMY3pf1Q',
                'Cielito Lindo',
                'Quirino Mendoza y Cortés',
                'spanish',
                'intermediate',
                180000,
                'images/spanish2.jpeg'
                
            ]
        );
        
        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);
        
        const lyrics = [
            { line: 1, time: 16, text: "De la sierra morena" },
            { line: 2, time: 19, text: "Cielito lindo, vienen bajando" },
            { line: 3, time: 26, text: "Un par de ojitos negros" },
            { line: 4, time: 28.5, text: "Cielito lindo, de contrabando" },
            { line: 5, time: 34.5, text: "Ay, ay, ay, ay, canta y no llores" },
            { line: 6, time: 41.5, text: "Porque cantando se alegran" },
            { line: 7, time: 44.5, text: "Cielito lindo, los corazones" },
            { line: 8, time: 50, text: "Ventanas a la calle son peligrosas" },
            { line: 9, time: 56, text: "Pa' las madres que tienen" },
            { line: 10, time: 57.5, text: "Cielito lindo, hijas hermosas" },
            { line: 11, time: 61, text: "Ay, ay, ay, ay, ay, y las prefieren" },
            { line: 12, time: 66, text: "Porque todo el que pasa" },
            { line: 13, time: 67.5, text: "Cielito lindo, besarlas quieren" }
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
                ON CONFLICT (song_id, line_number) 
                DO UPDATE SET
                    timestamp_ms = EXCLUDED.timestamp_ms,
                    original_text = EXCLUDED.original_text,
                    translated_text = EXCLUDED.translated_text,
                    language_to = EXCLUDED.language_to`,
                [songId, lyric.line, timestampMs, lyric.text, translation, 'en']
            );
            
            console.log(`  Line ${lyric.line} @ ${lyric.time}s: "${lyric.text}" → "${translation}"`);
        }
        
        console.log('\n Cielito Lindo setup complete!');
        console.log(`\nSong ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`Note: Existing lyrics were updated with new timestamps`);
        console.log(`\nTest at: http://localhost:3000/learn.html?id=${songId}`);
        
        process.exit(0);
    } catch (error) {
        console.error(' Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    addCielitoLindo();
}

module.exports = addCielitoLindo;