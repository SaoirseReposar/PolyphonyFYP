let currentUserId = null;

window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const connectButton = document.querySelector('a[href="/spotify/login"]');
    
    const userResponse = await fetch('/api/current-user');
    const userData = await userResponse.json();
    
    if (!userData.success) {
        if (connectButton) {
            connectButton.href = 'register';
            connectButton.textContent = 'Connect Spotify';
        }
        return;
    }
    
    currentUserId = userData.user.user_id;
    
    if (accessToken) {
        console.log('Spotify connected successfully!');
        
        localStorage.setItem(`spotify_access_token_${currentUserId}`, accessToken);
        if (refreshToken) {
            localStorage.setItem(`spotify_refresh_token_${currentUserId}`, refreshToken);
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        alert('✓ Successfully connected to Spotify!');
        
        if (connectButton) {
            connectButton.textContent = 'Go to Spotify';
            connectButton.href = 'spotifyplaylists.html';
        }
        
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const spotifyData = await response.json();
            console.log('Connected Spotify user:', spotifyData.display_name);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    } else if (isSpotifyConnected()) {
        const token = getSpotifyToken();
        const isValid = await checkTokenValidity(token);
        
        if (isValid) {
            if (connectButton) {
                connectButton.textContent = 'Go to Spotify';
                connectButton.href = 'spotifyplaylists.html';
            }
        } else {
            localStorage.removeItem(`spotify_access_token_${currentUserId}`);
            localStorage.removeItem(`spotify_refresh_token_${currentUserId}`);
        }
    }
});

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
    return localStorage.getItem(`spotify_access_token_${currentUserId}`) !== null;
}

function getSpotifyToken() {
    return localStorage.getItem(`spotify_access_token_${currentUserId}`);
}