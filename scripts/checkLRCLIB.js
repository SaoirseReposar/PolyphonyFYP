const lrclibService = require('../services/lrclibService');

async function checkLRCLIB() {
    const trackName = process.argv[2];
    const artistName = process.argv[3];
    
    if (!trackName || !artistName) {
        console.log('Usage: node scripts/checkLRCLIB.js "Song Title" "Artist Name"');
        console.log('Example: node scripts/checkLRCLIB.js "Vivir Mi Vida" "Marc Anthony"');
        process.exit(1);
    }
    
    console.log(`\nSearching LRCLIB for: "${trackName}" by ${artistName}\n`);
    
    const result = await lrclibService.getSyncedLyrics(trackName, artistName);
    
    if (result && result.syncedLyrics) {
        console.log('✅ Synced lyrics found!');
        console.log(`   Track: ${result.trackName}`);
        console.log(`   Artist: ${result.artistName}`);
        console.log(`   Album: ${result.albumName || 'N/A'}`);
        console.log(`   Duration: ${result.duration}s`);
        console.log('\nPreview (first 5 lines):');
        const parsed = lrclibService.parseLRC(result.syncedLyrics);
        parsed.slice(0, 5).forEach(line => {
            console.log(`   ${line.time}s: ${line.text}`);
        });
        console.log(`\n   Total lines: ${parsed.length}`);
        console.log('\nTo import, run:');
        console.log(`   node scripts/importFromLRCLIB.js "${trackName}" "${artistName}" LANGUAGE DIFFICULTY SPOTIFY_ID ALBUM_ART`);
    } else {
        console.log('❌ No synced lyrics found in LRCLIB');
        console.log('\nYou will need to add lyrics manually.');
        console.log('Use the manual script template for this song.');
    }
    
    process.exit(0);
}

checkLRCLIB().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});