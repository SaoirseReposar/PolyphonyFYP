const lrclibService = require('../services/lrclibService');
const db = require('../database');
const Translationservice = require('../services/Translationservice');

async function autoImportSong() {
    const trackName = process.argv[2];
    const artistName = process.argv[3];
    const language = process.argv[4];
    const difficulty = process.argv[5];
    const spotifyTrackId = process.argv[6];
    const albumArtUrl = process.argv[7] || null;
    
    if (!trackName || !artistName || !language || !difficulty || !spotifyTrackId) {
        console.log('\n📖 Universal Song Import Tool\n');
        console.log('Usage: node scripts/autoImport.js "Song Title" "Artist" language difficulty spotify_id [album_art]');
        console.log('\nExample:');
        console.log('  node scripts/autoImport.js "Despacito" "Luis Fonsi" spanish beginner 6habFhsOp2NvshLv26DqMb images/despacito.jpg');
        console.log('\nDifficulty: beginner, intermediate, advanced');
        console.log('Language: spanish, french, german, korean, etc.\n');
        process.exit(1);
    }
    
    try {
        console.log(`\n🎵 Importing "${trackName}" by ${artistName}...\n`);
        
        console.log('Step 1: Checking LRCLIB for synced lyrics...');
        const lyricsData = await lrclibService.getSyncedLyrics(trackName, artistName);
        
        if (!lyricsData || !lyricsData.syncedLyrics) {
            console.log('❌ No synced lyrics found in LRCLIB');
            console.log('\n📝 Manual entry required:');
            console.log(`   1. Find lyrics online (Genius, AZLyrics)`);
            console.log(`   2. Get timestamps (LRC Maker: https://lrcmaker.com)`);
            console.log(`   3. Create manual script for this song`);
            process.exit(1);
        }
        
        console.log('✅ Synced lyrics found!\n');
        
        const lyrics = lrclibService.parseLRC(lyricsData.syncedLyrics);
        console.log(`   Found ${lyrics.length} lines with timestamps`);
        
        console.log('\nStep 2: Adding song to database...');
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
                spotifyTrackId,
                trackName,
                artistName,
                language,
                difficulty,
                lyricsData.duration * 1000 || 180000,
                albumArtUrl
            ]
        );
        
        const songId = songResult.rows[0].id;
        console.log(`✅ Song saved with ID: ${songId}\n`);
        
        console.log('Step 3: Translating lyrics with DeepL...');
        const textsToTranslate = lyrics.map(l => l.text);
        const translations = await Translationservice.translateBatch(textsToTranslate, language, 'EN-US');
        console.log(`✅ Translated ${lyrics.length} lines\n`);
        
        console.log('Step 4: Saving lyrics to database...');
        for (let i = 0; i < lyrics.length; i++) {
            const lyric = lyrics[i];
            const translation = translations[i];
            const timestampMs = Math.round(lyric.time * 1000);
            
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
        }
        
        console.log('✅ All lyrics saved!\n');
        
        const audioFileName = trackName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        console.log('═══════════════════════════════════════════════');
        console.log('✅ Import Complete!');
        console.log('═══════════════════════════════════════════════');
        console.log(`Song ID: ${songId}`);
        console.log(`Total lyrics: ${lyrics.length}`);
        console.log(`Timestamps: ✅ Synced from LRCLIB`);
        console.log(`Translations: ✅ Auto-translated with DeepL`);
        console.log('\n📋 Next Steps:');
        console.log(`   1. Add audio file: audio/${audioFileName}.mp3`);
        console.log(`   2. Test: http://localhost:3000/learn.html?id=${songId}`);
        console.log(`   3. Adjust timestamps if needed\n`);
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

autoImportSong();