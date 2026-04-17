const db = require('../database');
const translationService = require('../services/translationService');

async function addOppaSaenggak() {
    try {
        console.log('Adding 오빠 생각...\n');

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
                'oppa_saenggak_traditional',
                '오빠 생각 (Oppa Saenggak)',
                'Traditional Folk Song',
                'korean',
                'beginner',
                180000,
                'images/korean3.jpeg',
                'audio/oppa.mp3'
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(` Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );

        const lyrics = [
            { line: 1, time: 15,  text: "뜸북뜸북 뜸북새 논에서 울고" },
            { line: 2, time: 30, text: "뻐꾹뻐꾹 뻐꾹새 숲에서 울 제" },
            { line: 3, time: 45, text: "우리 오빠 말 타고 서울 가시면" },
            { line: 4, time: 60, text: "비단구두 사가지고 오신다더니" },
            { line: 5, time: 90, text: "기럭기럭 기러기 북에서 오고" },
            { line: 6, time: 105, text: "귀뚤귀뚤 귀뚜라미 슬피 울건만" },
            { line: 7, time: 119, text: "서울 가신 오빠는 소식도 없고" },
            { line: 8, time: 134, text: "나뭇잎만 우수수 떨어집니다" }
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

        console.log('\n✓ 오빠 생각 setup complete!');
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
    addOppaSaenggak();
}

module.exports = addOppaSaenggak;