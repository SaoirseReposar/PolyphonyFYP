const db = require('../database');
const translationService = require('../services/translationService');

async function addAuClairDeLaLune() {
    try {
        console.log('Adding Au Clair de la Lune...\n');

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
                '0f5o0EhrqLg8MQQ4jWJWxF',  
                'Au Clair de la Lune',
                'Traditional Folk Song',
                'french',
                'intermediate',
                180000, 
                'images/french2.jpeg',
                'audio/clairdelune.mp3' 
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        const lyrics = [
            { line: 1, time: 5.5, text: "Au clair de la lune, mon ami Pierrot," },
            { line: 2, time: 11.5, text: "Prête-moi ta plume, pour écrire un mot." },
            { line: 3, time: 17, text: "Ma chandelle est morte, je n'ai plus de feu." },
            { line: 4, time: 23, text: "Ouvre-moi ta porte, pour l'amour de Dieu." },
            { line: 5, time: 34.5, text: "Au clair de la lune, Pierrot répondit :" },
            { line: 6, time: 41, text: "« Je n'ai pas de plume, je suis dans mon lit." },
            { line: 7, time: 46.5, text: "Va chez la voisine, je crois qu'elle y est," },
            { line: 8, time: 52.5, text: "Car dans sa cuisine, on bat le briquet. »" }
        ];

        console.log(`\nTranslating ${lyrics.length} lines from French to English...`);

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

        console.log('\n✓ Au Clair de la Lune setup complete!');
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
    addAuClairDeLaLune();
}

module.exports = addAuClairDeLaLune;
