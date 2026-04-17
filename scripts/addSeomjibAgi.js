const db = require('../database');
const translationService = require('../services/translationService');

async function addSeomjibAgi() {
    try {
        console.log('Adding 섬집 아기...\n');

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
                'seomjib_agi_traditional',
                '섬집 아기 (Seomjib Agi)',
                'Traditional Folk Song',
                'korean',
                'beginner',
                180000,
                'images/korean4.jpeg',
                'audio/seomjib.mp3'
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(` Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        const lyrics = [
            { line: 1, time: 0,   text: "엄마가 섬 그늘에 굴 따러 가면" },
            { line: 2, time: 15,  text: "아기가 혼자 남아 집을 보다가" },
            { line: 3, time: 28,  text: "바다가 불러주는 자장 노래에" },
            { line: 4, time: 42,  text: "팔 베고 스르르르 잠이 듭니다" },
            { line: 5, time: 82,  text: "아기는 잠을 곤히 자고 있지만" },
            { line: 6, time: 95,  text: "갈매기 울음 소리 맘이 설레어" },
            { line: 7, time: 109, text: "다 못 찬 굴바구니 머리에 이고" },
            { line: 8, time: 122, text: "엄마는 모랫길을 달려 옵니다" }
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

        console.log('\n✓ 섬집 아기 setup complete!');
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
    addSeomjibAgi();
}

module.exports = addSeomjibAgi;