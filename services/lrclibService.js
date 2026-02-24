const axios = require('axios');

const BASE_URL = 'https://lrclib.net/api';

async function searchSong(trackName, artistName) {
    try {
        const response = await axios.get(`${BASE_URL}/search`, {
            params: {
                track_name: trackName,
                artist_name: artistName
            }
        });
        
        if (response.data && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    } catch (error) {
        console.error('LRCLIB search error:', error.message);
        return null;
    }
}

async function getSyncedLyrics(trackName, artistName) {
    const song = await searchSong(trackName, artistName);
    
    if (!song || !song.syncedLyrics) {
        return null;
    }
    
    return {
        trackName: song.trackName,
        artistName: song.artistName,
        albumName: song.albumName,
        duration: song.duration,
        syncedLyrics: song.syncedLyrics,
        plainLyrics: song.plainLyrics
    };
}

function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];
    let lineNumber = 1;
    
    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.+)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = match[3].length === 2 ? parseInt(match[3]) : parseInt(match[3]) / 10;
            const text = match[4].trim();
            
            if (text) {
                const timestampSeconds = (minutes * 60) + seconds + (centiseconds / 100);
                
                lyrics.push({
                    line: lineNumber++,
                    time: timestampSeconds,
                    text: text
                });
            }
        }
    });
    
    return lyrics;
}

module.exports = {
    searchSong,
    getSyncedLyrics,
    parseLRC
};