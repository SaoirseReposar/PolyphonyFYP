// Spotify integration for homepage

window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const connectButton = document.querySelector('a[href="/spotify/login"]');

    const isLoggedIn = await checkUserAuthentication();
    
    if (!isLoggedIn && connectButton) {
        connectButton.href = 'register';
        connectButton.textContent = 'Connect Spotify';
        return;
    }

    if (accessToken) {
        console.log('Spotify connected successfully');
        
        localStorage.setItem('spotify_access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('spotify_refresh_token', refreshToken);
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        alert('Successfully connected to Spotify');

        const connectButton = document.querySelector('a[href="/spotify/login"]');
        if (connectButton && isSpotifyConnected()) {
        connectButton.textContent = 'See my playlists';
        connectButton.href = 'spotifyplaylists.html';
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
    } else if (isSpotifyConnected()) {
        const connectButton = document.querySelector('a[href="/spotify/login"]');
        if (connectButton) {
            connectButton.textContent = 'See my playlists';
            connectButton.href = 'spotifyplaylists.html';
        }
    } else {
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_refresh_token');
        }
});

async function checkUserAuthentication() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();
        return data.success === true;
    } catch {
        return false;
    }
}

async function checkTokenValidity(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok;
    } catch {
        return false;
    }
}

function isSpotifyConnected() {
    return localStorage.getItem('spotify_access_token') !== null;
}

function getSpotifyToken() {
    return localStorage.getItem('spotify_access_token');
}