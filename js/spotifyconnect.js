// Spotify integration for homepage

window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const connectButton = document.querySelector('a[href="/spotify/login"]');

    if (accessToken) {
        console.log('Spotify connected successfully');
        
        // Store tokens in localStorage
        localStorage.setItem('spotify_access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('spotify_refresh_token', refreshToken);
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        alert('Successfully connected to Spotify');

        const connectButton = document.querySelector('a[href="/spotify/login"]');
        if (connectButton && isSpotifyConnected()) {
        connectButton.textContent = 'Go to Spotify';
    }
        
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const userData = await response.json();
            console.log('Connected Spotify user:', userData.display_name);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

});

function isSpotifyConnected() {
    return localStorage.getItem('spotify_access_token') !== null;
}

function getSpotifyToken() {
    return localStorage.getItem('spotify_access_token');
}