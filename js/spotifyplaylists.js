
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
let currentUserId = null;
let currentSpotifyToken = null;

window.addEventListener('load', async () => {
    const userResponse = await fetch('/api/current-user');
    const userData = await userResponse.json();

    if (!userData.success) {
        showError();
        return;
    }

    currentUserId = userData.user.user_id;
    currentSpotifyToken = localStorage.getItem(`spotify_access_token_${currentUserId}`);

    if (!currentSpotifyToken) {
        showError();
        return;
    }

    await loadPlaylists(currentSpotifyToken, currentUserId);
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

        if (!response.ok) throw new Error('Failed to fetch playlists');

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
    playlistTitle.textContent = playlist.name;
    playlistDescription.textContent = `${playlist.tracks.total} songs`;

    playlistsView.style.display = 'none';
    tracksView.classList.add('active');
    trackList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading tracks...</p></div>';

    try {
        const response = await fetch(playlist.tracks.href, {
            headers: { 'Authorization': `Bearer ${currentSpotifyToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch tracks');

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

        trackDiv.dataset.track = JSON.stringify({
            id: track.id,
            name: track.name,
            artists: track.artists.map(a => a.name),
            albumArt: track.album.images?.[0]?.url || '',
            durationMs: track.duration_ms,
            availableMarkets: track.available_markets || []
        });

        const image = track.album.images?.length > 0
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

        trackDiv.onclick = () => handleTrackClick(trackDiv);
        trackList.appendChild(trackDiv);

        checkIfSongExists(track.id, trackDiv);
    });
}

async function checkIfSongExists(spotifyTrackId, trackDiv) {
    try {
        const response = await fetch(`/api/songs/spotify/${spotifyTrackId}`);
        const data = await response.json();

        const statusDiv = trackDiv.querySelector('.track-status');

        if (data.success && data.song) {
            statusDiv.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
            trackDiv.dataset.songId = data.song.id;
            trackDiv.dataset.hasLyrics = 'true';
        } else {
            statusDiv.innerHTML = '<i class="bi bi-cloud-download text-muted" title="Click to auto-import"></i>';
            trackDiv.dataset.hasLyrics = 'false';
        }
    } catch (err) {
        console.error('Error checking song:', err);
        const statusDiv = trackDiv.querySelector('.track-status');
        statusDiv.innerHTML = '<i class="bi bi-question-circle text-muted"></i>';
        trackDiv.dataset.hasLyrics = 'false';
    }
}

async function handleTrackClick(trackDiv) {
    const hasLyrics = trackDiv.dataset.hasLyrics === 'true';
    const songId = trackDiv.dataset.songId;

    if (hasLyrics && songId) {
        window.location.href = `learn.html?id=${songId}`;
        return;
    }

    if (trackDiv.dataset.hasLyrics === undefined || trackDiv.dataset.hasLyrics === '') {
        return;
    }

    const trackData = JSON.parse(trackDiv.dataset.track || '{}');
    if (!trackData.id) return;

    setTrackImporting(trackDiv, true);

    try {
        const response = await fetch('/api/songs/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spotifyTrackId: trackData.id,
                trackName: trackData.name,
                artistName: trackData.artists[0],
                albumArtUrl: trackData.albumArt,
                durationMs: trackData.durationMs,
                availableMarkets: trackData.availableMarkets,
                spotifyToken: currentSpotifyToken
            })
        });

        const data = await response.json();

        if (data.success) {
            trackDiv.dataset.hasLyrics = 'true';
            trackDiv.dataset.songId = data.songId;
            const statusDiv = trackDiv.querySelector('.track-status');
            statusDiv.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';

            await new Promise(r => setTimeout(r, 400));
            window.location.href = `learn.html?id=${data.songId}`;

        } else {
            setTrackImporting(trackDiv, false);

            if (data.error === 'no_lyrics') {
                showImportError(trackDiv, 'No lyrics found on LRCLIB for this song');
            } else if (data.error === 'unsupported_language') {
                showImportError(trackDiv, `Language not supported: ${data.detectedLanguage}`);
            } else {
                showImportError(trackDiv, 'Import failed — please try again');
            }
        }

    } catch (err) {
        console.error('Import error:', err);
        setTrackImporting(trackDiv, false);
        showImportError(trackDiv, 'Network error during import');
    }
}

function setTrackImporting(trackDiv, isImporting) {
    const statusDiv = trackDiv.querySelector('.track-status');
    const nameDiv = trackDiv.querySelector('.track-name');

    if (isImporting) {
        trackDiv.style.pointerEvents = 'none';
        trackDiv.style.opacity = '0.7';
        statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"></div>';
        nameDiv.dataset.originalName = nameDiv.textContent;
        nameDiv.textContent = `${nameDiv.textContent} — importing...`;
    } else {
        trackDiv.style.pointerEvents = '';
        trackDiv.style.opacity = '';
        if (nameDiv.dataset.originalName) {
            nameDiv.textContent = nameDiv.dataset.originalName;
        }
    }
}

function showImportError(trackDiv, message) {
    const statusDiv = trackDiv.querySelector('.track-status');
    statusDiv.innerHTML = '<i class="bi bi-exclamation-circle text-danger" title="' + message + '"></i>';

    setTimeout(() => {
        statusDiv.innerHTML = '<i class="bi bi-cloud-download text-muted"></i>';
    }, 4000);
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