// services/spotifyService.js - Spotify API Service
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Token management
let accessToken = null;
let tokenExpirationTime = null;

/**
 * Get or refresh access token
 * @returns {Promise<string>} - Access token
 */
async function getAccessToken() {
    // Check if token is still valid
    if (accessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
        return accessToken;
    }

    try {
        const data = await spotifyApi.clientCredentialsGrant();
        accessToken = data.body['access_token'];
        tokenExpirationTime = Date.now() + (data.body['expires_in'] * 1000) - 60000; // Refresh 1 min early
        
        spotifyApi.setAccessToken(accessToken);
        console.log('✓ Spotify access token refreshed');
        
        return accessToken;
    } catch (error) {
        console.error('Error getting Spotify access token:', error);
        throw new Error('Failed to authenticate with Spotify');
    }
}

/**
 * Get track information by Spotify Track ID
 * @param {string} trackId - Spotify Track ID
 * @returns {Promise<Object>} - Track information
 */
async function getTrackInfo(trackId) {
    try {
        await getAccessToken();
        const data = await spotifyApi.getTrack(trackId);
        
        return {
            id: data.body.id,
            name: data.body.name,
            artist: data.body.artists.map(a => a.name).join(', '),
            album: data.body.album.name,
            duration_ms: data.body.duration_ms,
            preview_url: data.body.preview_url,
            album_art: data.body.album.images[0]?.url || null,
            spotify_url: data.body.external_urls.spotify,
            uri: data.body.uri
        };
    } catch (error) {
        console.error('Error fetching track info:', error);
        throw new Error('Failed to fetch track information');
    }
}

/**
 * Search for a track
 * @param {string} query - Search query (song name, artist, etc.)
 * @returns {Promise<Array>} - Array of track results
 */
async function searchTracks(query) {
    try {
        await getAccessToken();
        const data = await spotifyApi.searchTracks(query, { limit: 10 });
        
        return data.body.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
            album_art: track.album.images[0]?.url || null,
            spotify_url: track.external_urls.spotify
        }));
    } catch (error) {
        console.error('Error searching tracks:', error);
        throw new Error('Failed to search tracks');
    }
}

/**
 * Get audio analysis for a track (tempo, key, etc.)
 * @param {string} trackId - Spotify Track ID
 * @returns {Promise<Object>} - Audio analysis
 */
async function getAudioAnalysis(trackId) {
    try {
        await getAccessToken();
        const data = await spotifyApi.getAudioAnalysisForTrack(trackId);
        return data.body;
    } catch (error) {
        console.error('Error fetching audio analysis:', error);
        throw new Error('Failed to fetch audio analysis');
    }
}

/**
 * Get authorization URL for user login (if needed later)
 * @returns {string} - Authorization URL
 */
function getAuthorizationUrl() {
    const scopes = ['streaming', 'user-read-email', 'user-read-private'];
    return spotifyApi.createAuthorizeURL(scopes);
}

module.exports = {
    getAccessToken,
    getTrackInfo,
    searchTracks,
    getAudioAnalysis,
    getAuthorizationUrl,
    spotifyApi
};