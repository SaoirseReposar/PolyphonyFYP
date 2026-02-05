const db = require('../database');
const translationService = require('../services/translationService');

async function addLaLlorona() {
    try {
        console.log('Adding La Llorona...\n');

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
                '33ggMFJ7oxYywWedkIgwhx',
                'La Llorona',
                'Traditional Folk Song',
                'spanish',
                'advanced',
                240000, 
                'images/spanish3.jpeg',
                'audio/la-llorona.mp3' 
            ]
        );

        const songId = songResult.rows[0].id;
        console.log(`✓ Song added/updated with ID: ${songId}`);

        await db.query(
    `DELETE FROM lyrics WHERE song_id = $1`,
    [songId]
);

       const lyrics = [
    { line: 1, time: 9.5, text: "Ay, de mí llorona, llorona, llorona, de azul celeste" },
    { line: 2, time: 21, text: "Ay, de mí llorona, llorona, llorona de azul celeste" },
    { line: 3, time: 33, text: "Aunque la vida me cueste, llorona, no dejaré de quererte" },
    { line: 4, time: 44.5, text: "Aunque la vida me cueste, llorona, no dejaré de quererte" },

    { line: 5, time: 56, text: "No sé que tienen las flores, llorona, las flores del campo santo" },
    { line: 6, time: 68, text: "No sé que tienen las flores, llorona, las flores del campo santo" },
    { line: 7, time: 79, text: "Que cuando las mueve el viento, llorona, parece que están llorando" },
    { line: 8, time: 92, text: "Que cuando las mueve el viento, llorona, parece que están llorando" }
];


        console.log(`\nTranslating ${lyrics.length} lines from Spanish to English...`);

        const textsToTranslate = lyrics.map(l => l.text);
        const translations = await translationService.translateBatch(
            textsToTranslate,
            'spanish',
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
                `  Line ${lyric.line} @ ${lyric.time}s: "${lyric.text}" → "${translation}"`
            );
        }

        console.log('\n✓ La Llorona setup complete!');
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
    addLaLlorona();
}

module.exports = addLaLlorona;
