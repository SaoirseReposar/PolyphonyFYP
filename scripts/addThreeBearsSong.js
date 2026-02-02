const db = require('../database');
const translationService = require('../services/translationService');

async function addThreeBearsSong() {
    try {
        console.log('Adding 곰 세 마리 (Three Bears Song)...\n');

        // 1️⃣ Insert/update the song
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
                '7konkcoUay4HcsgK6Ikm7l',  // Spotify track ID
                '곰 세 마리 (Three Bears Song)',
                'Nursery Song',
                'korean',
                'beginner',
                90000, // ~1.5 minutes
                'images/korean1.jpeg',
                'audio/three-bears-song.mp3' // local audio file
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);

        // 2️⃣ Remove old lyrics
        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        // 3️⃣ Define lyrics with line numbers and placeholder timestamps
        const lyrics = [
            { line: 1, time: 8, text: "곰세마리가" },
            { line: 2, time: 10, text: "한집에있어" },
            { line: 3, time: 12.3, text: "아빠곰" },
            { line: 4, time: 13, text: "엄마곰" },
            { line: 5, time: 14.2, text: "애기곰" },
            { line: 6, time: 16, text: "아빠곰은 뚱뚱해" },
            { line: 7, time: 20, text: "엄마곰은 날씬해" },
            { line: 8, time: 24, text: "애기곰은 너무귀여워" },
            { line: 9, time: 28, text: "으쑥 으쑥 잘한다" }
        ];

        console.log(`\nTranslating ${lyrics.length} lines from Korean to English...`);

        // 4️⃣ Prepare batch for translation (skip lines with only non-letter characters)
        const textsToTranslate = lyrics.map(l =>
            /[가-힣a-zA-Z]/.test(l.text) ? l.text : null
        ).filter(t => t !== null);

        const translations = await translationService.translateBatch(
            textsToTranslate,
            'korean',
            'EN-US'
        );

        console.log('✓ Translations received\n');

        // 5️⃣ Insert lyrics into database, mapping back translations
        let translationIndex = 0;
        for (let lyric of lyrics) {
            let translation;
            if (/[가-힣a-zA-Z]/.test(lyric.text)) {
                translation = translations[translationIndex];
                translationIndex++;
            } else {
                translation = lyric.text; // keep sound-only lines
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

        console.log('\n✓ 곰 세 마리 (Three Bears Song) setup complete!');
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
    addThreeBearsSong();
}

module.exports = addThreeBearsSong;
