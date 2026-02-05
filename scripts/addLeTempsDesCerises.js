const db = require('../database');
const translationService = require('../services/translationService');

async function addLeTempsDesCerises() {
    try {
        console.log('Adding Le Temps des Cerises...\n');

        const songResult = await db.query(
            `INSERT INTO songs (
                spotify_track_id,
                title,
                artist,
                language,
                difficulty,
                duration_ms,
                album_art_url,
                audio_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (spotify_track_id) DO UPDATE SET
                title = EXCLUDED.title,
                artist = EXCLUDED.artist,
                album_art_url = EXCLUDED.album_art_url,
                audio_url = EXCLUDED.audio_url,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id`,
            [
                '5UvDGgwPWPTy4hMSIq2BEl',  
                "Le Temps des Cerises",
                "Jean-Baptiste Clément, Antoine Renard",
                "french",
                "advanced",
                240000,
                'images/french3.jpeg',
                'audio/cerises.mp3' 
            ]
        );

        const songId = songResult.rows[0].id
        console.log(`✓ Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        const lyrics = [
            { line: 1, time: 0, text: "Quand nous chanterons le temps des cerises" },
            { line: 2, time: 6.5, text: "Et gai rossignol et merle moqueur" },
            { line: 3, time: 13.5, text: "Seront tous en fête" },
            { line: 4, time: 21, text: "Les belles auront la folie en tête" },
            { line: 5, time: 28.5, text: "Et les amoureux du soleil au cœur" },
            { line: 6, time: 37, text: "Quand nous chanterons le temps des cerises" },
            { line: 7, time: 43.5, text: "Sifflera bien mieux le merle moqueur" },
            { line: 8, time: 59, text: "Mais il est bien court le temps des cerises" },
            { line: 9, time: 64, text: "Où l'on s'en va deux cueillir en rêvant" },
            { line: 10, time: 69, text: "Des pendants d'oreilles" },
            { line: 11, time: 77, text: "Cerises d'amour aux robes pareilles" },
            { line: 12, time: 84, text: "Tombant sous la feuille en gouttes de sang" },
            { line: 13, time: 91.5, text: "Mais il est bien court le temps des cerises" },
            { line: 14, time: 97.5, text: "Pendants de corail qu'on cueille en rêvant" }
        ];

        console.log(`\nTranslating ${lyrics.length} lines from French to English...`);

        // 4️⃣ Prepare batch for translation (skip non-letters)
        const textsToTranslate = lyrics.map(l =>
            /[a-zA-ZÀ-ÿ]/.test(l.text) ? l.text.replace(/[«»]/g, '') : null
        ).filter(t => t !== null);

        const translations = await translationService.translateBatch(
            textsToTranslate,
            'french',
            'EN-US'
        );

        console.log('✓ Translations received\n');

        let translationIndex = 0;
        for (let lyric of lyrics) {
            let translation;
            if (/[a-zA-ZÀ-ÿ]/.test(lyric.text)) {
                translation = translations[translationIndex];
                translationIndex++;
            } else {
                translation = lyric.text; 
            }

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
                [
                    songId,
                    lyric.line,
                    timestampMs,
                    lyric.text,
                    translation,
                    'en'
                ]
            );

            console.log(`Line ${lyric.line} @ ${lyric.time}s: "${lyric.text}" → "${translation}"`);
        }

        console.log('\n✓ Le Temps des Cerises setup complete!');
        console.log(`Song ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`\nTest at: http://localhost:3000/learn.html?id=${songId}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    addLeTempsDesCerises();
}

module.exports = addLeTempsDesCerises;
