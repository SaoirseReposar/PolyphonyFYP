const loading = document.getElementById('loading');
const error = document.getElementById('error');
const playlistsView = document.getElementById('playlistsView');
const tracksView = document.getElementById('tracksView');
const playlistGrid = document.getElementById('playlistGrid');
const trackList = document.getElementById('trackList');
const backBtn = document.getElementById('backBtn');
const playlistTitle = document.getElementById('playlistTitle');
const playlistDescription = document.getElementById('playlistDescription');

let currentPlaylists = [];

window.addEventListener('load', async () => {
    const userResponse = await fetch('/api/current-user');
    const userData = await userResponse.json();
    
    if (!userData.success) {
        showError();
        return;
    }
    
    const userId = userData.user.user_id;
    const token = localStorage.getItem(`spotify_access_token_${userId}`);
    
    if (!token) {
        showError();
        return;
    }
    
    await loadPlaylists(token, userId);
});

async function loadPlaylists(token, userId) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            localStorage.removeItem(`spotify_access_token_${userId}`);
            localStorage.removeItem(`spotify_refresh_token_${userId}`);
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch playlists');
        }
        
        const data = await response.json();
        currentPlaylists = data.items;
        
        displayPlaylists(currentPlaylists);
        
        loading.style.display = 'none';
        playlistsView.style.display = 'block';
        
    } catch (err) {
        console.error('Error loading playlists:', err);
        showError();
    }
}

function displayPlaylists(playlists) {
    playlistGrid.innerHTML = '';
    
    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.onclick = () => loadTracks(playlist);
        
        const image = playlist.images && playlist.images.length > 0 
            ? playlist.images[0].url 
            : '';
        
        card.innerHTML = `
            <img src="${image}" class="playlist-image" alt="${playlist.name}">
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-tracks">${playlist.tracks.total} songs</div>
            </div>
        `;
        
        playlistGrid.appendChild(card);
    });
}

async function loadTracks(playlist) {
    const userResponse = await fetch('/api/current-user');
    const userData = await userResponse.json();
    
    if (!userData.success) {
        trackList.innerHTML = '<p style="text-align: center; color: #999;">Failed to load tracks</p>';
        return;
    }
    
    const userId = userData.user.user_id;
    const token = localStorage.getItem(`spotify_access_token_${userId}`);
    
    playlistTitle.textContent = playlist.name;
    playlistDescription.textContent = `${playlist.tracks.total} songs`;
    
    playlistsView.style.display = 'none';
    tracksView.classList.add('active');
    trackList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading tracks...</p></div>';
    
    try {
        const response = await fetch(playlist.tracks.href, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch tracks');
        }
        
        const data = await response.json();
        displayTracks(data.items);
        
    } catch (err) {
        console.error('Error loading tracks:', err);
        trackList.innerHTML = '<p style="text-align: center; color: #999;">Failed to load tracks</p>';
    }
}

function displayTracks(items) {
    trackList.innerHTML = '';
    
    items.forEach(item => {
        if (!item.track) return;
        
        const track = item.track;
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.style.cursor = 'pointer';
        
        const image = track.album.images && track.album.images.length > 0 
            ? track.album.images[track.album.images.length - 1].url 
            : '';
        
        const artists = track.artists.map(a => a.name).join(', ');
        const duration = formatDuration(track.duration_ms);
        
        trackDiv.innerHTML = `
            <img src="${image}" class="track-image" alt="${track.name}">
            <div class="track-details">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${artists}</div>
            </div>
            <div class="track-duration">${duration}</div>
            <div class="track-status">
                <div class="spinner-border spinner-border-sm" role="status"></div>
            </div>
        `;
        
        trackDiv.onclick = () => handleTrackClick(track, trackDiv);
        
        trackList.appendChild(trackDiv);
        
        checkIfSongExists(track.id, trackDiv);
    });
}

async function checkIfSongExists(spotifyTrackId, trackDiv) {
    try {
        console.log('Checking song:', spotifyTrackId);
        const response = await fetch(`http://localhost:4000/api/songs/spotify/${spotifyTrackId}`);
        const data = await response.json();
        console.log('Response for', spotifyTrackId, ':', data);
        
        const statusDiv = trackDiv.querySelector('.track-status');
        
        if (data.success && data.song) {
            console.log('Song found! Setting hasLyrics to true');
            statusDiv.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
            trackDiv.dataset.songId = data.song.id;
            trackDiv.dataset.hasLyrics = 'true';
        } else {
            console.log('Song not found, setting hasLyrics to false');
            statusDiv.innerHTML = '<i class="bi bi-plus-circle text-muted"></i>';
            trackDiv.dataset.hasLyrics = 'false';
        }
    } catch (error) {
        console.error('Error checking song:', error);
        const statusDiv = trackDiv.querySelector('.track-status');
        statusDiv.innerHTML = '<i class="bi bi-question-circle text-muted"></i>';
        trackDiv.dataset.hasLyrics = 'false';
    }
}

async function handleTrackClick(track, trackDiv) {
    const hasLyrics = trackDiv.dataset.hasLyrics === 'true';
    const songId = trackDiv.dataset.songId;
    
    if (hasLyrics && songId) {
        window.location.href = `learn.html?id=${songId}`;
    } else {
        alert(
            `"${track.name}" doesn't have lyrics yet.\n\n` +
            `You can add it using:\n` +
            `node scripts/checkLRCLIB.js "${track.name}" "${track.artists[0].name}"\n\n` +
            `Or create a manual script for it.`
        );
    }
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showError() {
    loading.style.display = 'none';
    error.style.display = 'block';
}

backBtn.addEventListener('click', () => {
    tracksView.classList.remove('active');
    playlistsView.style.display = 'block';
});