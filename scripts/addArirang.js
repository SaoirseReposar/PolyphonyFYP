const db = require('../database');
const translationService = require('../services/translationService');

async function addArirang() {
    try {
        console.log('Adding 아리랑 (Arirang)...\n');

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
                '1m7WeqX04UA4Znl3Mcs3yk', 
                '아리랑 (Arirang)',
                'Traditional Folk Song',
                'korean',
                'intermediate',
                150000, 
                'images/korean2.jpeg',
                'audio/arirang.mp3'
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        const lyrics = [
            { line: 1, time: 19.5, text: "아리랑, 아리랑, 아라리요..." },
            { line: 2, time: 27, text: "아리랑 고개로 넘어간다." },
            { line: 3, time: 34, text: "나를 버리고 가시는 님은" },
            { line: 4, time: 41.5, text: "십리도 못가서 발병난다" }
        ];

        console.log(`\nTranslating ${lyrics.length} lines from Korean to English...`);

        const textsToTranslate = lyrics.map(l => l.text);
        const translations = await translationService.translateBatch(
            textsToTranslate,
            'korean',
            'EN-US'
        );

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
                [
                    songId,
                    lyric.line,
                    timestampMs,
                    lyric.text,
                    translation,
                    'en'
                ]
            );

            console.log(
                `Line ${lyric.line} @ ${lyric.time}s: "${lyric.text}" → "${translation}"`
            );
        }

        console.log('\n✓ 아리랑 (Arirang) setup complete!');
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
    addArirang();
}

module.exports = addArirang;
