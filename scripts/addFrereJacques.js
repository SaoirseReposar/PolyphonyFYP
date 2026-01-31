const db = require('../database');
const translationService = require('../services/translationService');

async function addFrereJacques() {
    try {
        console.log('Adding Frère Jacques...\n');


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
                '4vtLMw7V9b6BdaevH2i8PS',  
                'Frère Jacques',
                'Traditional',
                'french',
                'beginner',
                120000, 
                'images/french1.jpeg',
                'audio/frere-jacques.mp3' 
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);

        await db.query(
            `DELETE FROM lyrics WHERE song_id = $1`,
            [songId]
        );


        const lyrics = [
            { line: 1, time: 8, text: "Frère Jacques" },
            { line: 2, time: 10, text: "Frère Jacques" },
            { line: 3, time: 12, text: "Dormez-vous? Dormez-vous?" },
            { line: 4, time: 16, text: "Sonnez les mâtines" },
            { line: 5, time: 18, text: "Sonnez les mâtines" },
            { line: 6, time: 20, text: "Ding, deng, dong" },
            { line: 7, time: 22, text: "Ding, deng, dong" },
            { line: 8, time: 34, text: "Frère Jacques" },
            { line: 9, time: 36, text: "Frère Jacques" },
            { line: 10, time: 38, text: "Dormez-vous? Dormez-vous?" },
            { line: 11, time: 41.5, text: "Sonnez les mâtines" },
            { line: 12, time: 43.5, text: "Sonnez les mâtines" },
            { line: 13, time: 46, text: "Ding, deng, dong" },
            { line: 14, time: 48, text: "Ding, deng, dong" },
        ];

        console.log(`\nTranslating ${lyrics.length} lines from French to English...`);


const textsToTranslate = lyrics
    .map(l => l.text)
    .filter(text => /[a-zA-ZÀ-ÿ]/.test(text)); 


const translations = await translationService.translateBatch(
    textsToTranslate,
    'french',
    'EN-US'
);

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



        console.log('\n✓ Frère Jacques setup complete!');
        console.log(`Song ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`\nTest at: http://localhost:3000/learn.html?id=${songId}`);

        process.exit(0);
    } catch (error) {
        console.error(' Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    addFrereJacques();
}

module.exports = addFrereJacques;
