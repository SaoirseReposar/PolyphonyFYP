const API_BASE_URL = '/api';

let currentSong = null;
let savedWords = new Set();
let currentLineIndex = -1;

let spotifyPlayer = null;
let spotifyDeviceId = null;
let spotifyToken = null;
let isSpotifyReady = false;
let isSpotifyTrack = false;
let playerStateInterval = null;
let spotifyDurationMs = 0;

window.onSpotifyWebPlaybackSDKReady = () => {
    initSpotifyPlayer();
};

function getStoredSpotifyToken() {
    const userId = window.__polyphonyUserId;
    if (userId) {
        return localStorage.getItem(`spotify_access_token_${userId}`);
    }
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('spotify_access_token_')) {
            return localStorage.getItem(key);
        }
    }
    return null;
}

function initSpotifyPlayer() {
    spotifyToken = getStoredSpotifyToken();
    if (!spotifyToken) {
        console.log('No Spotify token found — SDK playback unavailable');
        return;
    }

    spotifyPlayer = new Spotify.Player({
        name: 'Polyphony',
        getOAuthToken: cb => cb(spotifyToken),
        volume: 0.8
    });

    spotifyPlayer.addListener('ready', ({ device_id }) => {
        spotifyDeviceId = device_id;
        isSpotifyReady = true;
        console.log('✓ Spotify player ready, device:', device_id);
        if (currentSong && isSpotifyTrack) {
            showSpotifyPlayer();
        }
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.warn('Spotify player went offline:', device_id);
        isSpotifyReady = false;
    });

    spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        if (state.duration) spotifyDurationMs = state.duration;
        syncLyricsToSpotify(state.position);
        updateSpotifyControls(state);
        updateSpotifyProgressBar(state.position, state.duration);
    });

    spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('SDK init error:', message);
    });

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('SDK auth error:', message);
    });

    spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('SDK account error (Premium required):', message);
        showNonPremiumFallback();
    });

    spotifyPlayer.connect();
}

async function startSpotifyPlayback() {
    if (!isSpotifyReady || !spotifyDeviceId || !spotifyToken) return;

    const trackUri = `spotify:track:${currentSong.spotify_track_id}`;

    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: [trackUri] })
        });

        document.getElementById('playBtn').innerHTML = '<i class="bi bi-pause-fill"></i>';

        clearInterval(playerStateInterval);
        playerStateInterval = setInterval(async () => {
            if (!spotifyPlayer) return;
            const state = await spotifyPlayer.getCurrentState();
            if (!state || state.paused) return;
            if (state.duration) spotifyDurationMs = state.duration;
            syncLyricsToSpotify(state.position);
            updateSpotifyProgressBar(state.position, state.duration);
        }, 250);

    } catch (err) {
        console.error('Failed to start Spotify playback:', err);
    }
}

function syncLyricsToSpotify(positionMs) {
    if (!currentSong || !currentSong.lyrics) return;
    const lyrics = currentSong.lyrics;

    for (let i = 0; i < lyrics.length; i++) {
        const start = lyrics[i].timestamp_ms;
        const end = lyrics[i + 1] ? lyrics[i + 1].timestamp_ms : Infinity;

        if (positionMs >= start && positionMs < end) {
            if (currentLineIndex !== i) {
                document.querySelectorAll('.lyric-line').forEach(line => {
                    line.classList.remove('active');
                    const t = line.querySelector('.lyric-line-translation');
                    if (t) t.style.display = 'none';
                });

                const activeLine = document.querySelector(`[data-index="${i}"]`);
                if (activeLine) {
                    activeLine.classList.add('active');
                    activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const t = activeLine.querySelector('.lyric-line-translation');
                    if (t) t.style.display = 'block';
                }
                currentLineIndex = i;
            }
            break;
        }
    }
}

function updateSpotifyControls(state) {
    const playBtn = document.getElementById('playBtn');
    if (!playBtn) return;
    playBtn.innerHTML = state.paused
        ? '<i class="bi bi-play-fill"></i>'
        : '<i class="bi bi-pause-fill"></i>';
}

function updateSpotifyProgressBar(positionMs, durationMs) {
    const dur = durationMs || spotifyDurationMs;
    const pct = dur > 0 ? (positionMs / dur) * 100 : 0;
    const fill = document.getElementById('progressFill');
    const current = document.getElementById('currentTime');
    const total = document.getElementById('totalTime');
    if (fill) fill.style.width = pct + '%';
    if (current) current.textContent = formatTime(positionMs / 1000);
    if (total && dur) total.textContent = formatTime(dur / 1000);
}

function showSpotifyPlayer() {
    const warning = document.getElementById('audioWarning');
    if (warning) warning.style.display = 'none';
    const badge = document.getElementById('spotifyBadge');
    if (badge) badge.style.display = 'inline-flex';
}

function showNonPremiumFallback() {
    const warning = document.getElementById('audioWarning');
    if (warning) {
        warning.style.display = 'block';
        warning.innerHTML = `
            <i class="bi bi-spotify me-2"></i>
            Full audio requires Spotify Premium.
            <a href="https://open.spotify.com/track/${currentSong?.spotify_track_id || ''}" 
               target="_blank" class="ms-2">Open in Spotify</a>
        `;
    }
}


async function init() {
    try {
        const userRes = await fetch('/api/current-user');
        const userData = await userRes.json();
        if (userData.success) {
            window.__polyphonyUserId = userData.user.user_id;
        }
    } catch (e) { /* non-fatal */ }

    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');

    if (!songId) {
        showError('No song selected. Please go back to the library.');
        return;
    }

    await loadSong(songId);
}

async function loadSong(songId) {
    try {
        showLoading('Loading song...');

        const response = await fetch(`${API_BASE_URL}/songs/${songId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        currentSong = {
            ...data.song,
            lyrics: data.song.lyrics || data.lyrics || []
        };

        isSpotifyTrack = !!currentSong.spotify_track_id && !currentSong.audio_url;
        spotifyDurationMs = currentSong.duration_ms || 0;

        updateSongHeader();
        initializeLyrics();
        setupPlayer();

        hideLoading();
    } catch (error) {
        console.error('Error loading song:', error);
        showError('Failed to load song. Please try again.');
    }
}

function setupPlayer() {
    if (isSpotifyTrack) {
        setupSpotifyPlayer();
    } else {
        setupAudioPlayer();
    }
}

function setupSpotifyPlayer() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer) audioPlayer.style.display = 'none';

    if (isSpotifyReady) {
        showSpotifyPlayer();
    }

    if (currentSong.duration_ms) {
        spotifyDurationMs = currentSong.duration_ms;
        const total = document.getElementById('totalTime');
        if (total) total.textContent = formatTime(currentSong.duration_ms / 1000);
    }
}

function setupAudioPlayer() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (!audioPlayer) return;

    if (currentSong.audio_url) {
        audioPlayer.src = currentSong.audio_url;
    } else {
        const audioFileName = currentSong.title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        audioPlayer.src = `audio/${audioFileName}.mp3`;
    }

    audioPlayer.load();
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-play-fill"></i>';
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', onSongEnd);
    audioPlayer.addEventListener('error', () => {
        console.error('Audio load error:', audioPlayer.src);
        const warning = document.getElementById('audioWarning');
        if (warning) {
            warning.style.display = 'block';
            warning.textContent = 'Audio file not found.';
        }
    });
}


function togglePlay() {
    if (!isSpotifyTrack) {
        const audioPlayer = document.getElementById('audioPlayer');
        const playBtn = document.getElementById('playBtn');
        if (audioPlayer.paused) {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
        return;
    }

    if (!isSpotifyReady) {
        if (!window._spotifyRetryCount) window._spotifyRetryCount = 0;
        window._spotifyRetryCount++;
        if (window._spotifyRetryCount > 5) {
            window._spotifyRetryCount = 0;
            console.warn('Spotify SDK failed to load — falling back to audio');
            isSpotifyTrack = false;
            setupAudioPlayer();
            return;
        }
        console.log('Spotify SDK not ready yet, retrying in 1s...');
        setTimeout(togglePlay, 1000);
        return;
    }

    window._spotifyRetryCount = 0;

    spotifyPlayer.getCurrentState().then(state => {
        if (!state) {
            startSpotifyPlayback();
        } else if (state.paused) {
            spotifyPlayer.resume().then(() => {
                document.getElementById('playBtn').innerHTML = '<i class="bi bi-pause-fill"></i>';
                clearInterval(playerStateInterval);
                playerStateInterval = setInterval(async () => {
                    if (!spotifyPlayer) return;
                    const s = await spotifyPlayer.getCurrentState();
                    if (!s || s.paused) return;
                    if (s.duration) spotifyDurationMs = s.duration;
                    syncLyricsToSpotify(s.position);
                    updateSpotifyProgressBar(s.position, s.duration);
                }, 250);
            });
        } else {
            spotifyPlayer.pause().then(() => {
                document.getElementById('playBtn').innerHTML = '<i class="bi bi-play-fill"></i>';
                clearInterval(playerStateInterval);
            });
        }
    });
}

function restart() {
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
        const t = line.querySelector('.lyric-line-translation');
        if (t) t.style.display = 'none';
    });

    if (isSpotifyTrack) {
        startSpotifyPlayback();
    } else {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        document.getElementById('playBtn').innerHTML = '<i class="bi bi-pause-fill"></i>';
    }
}

function changeSpeed() {
    if (isSpotifyTrack) return;
    const audioPlayer = document.getElementById('audioPlayer');
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(audioPlayer.playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    audioPlayer.playbackRate = speeds[nextIndex];
    document.getElementById('speedDisplay').textContent = speeds[nextIndex] + 'x';
}

function seek(event) {
    if (isSpotifyTrack) {
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        const posMs = Math.round(pct * spotifyDurationMs);

        if (posMs > 0 && spotifyPlayer) {
            spotifyPlayer.seek(posMs);
            syncLyricsToSpotify(posMs);
            updateSpotifyProgressBar(posMs, spotifyDurationMs);
        }
    } else {
        const audioPlayer = document.getElementById('audioPlayer');
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        audioPlayer.currentTime = (clickX / rect.width) * audioPlayer.duration;
    }
}


function updateProgress() {
    const audioPlayer = document.getElementById('audioPlayer');
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
    syncLyricsToSpotify(audioPlayer.currentTime * 1000);
}

function updateDuration() {
    const audioPlayer = document.getElementById('audioPlayer');
    document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
}

function onSongEnd() {
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-play-fill"></i>';
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
    });
    clearInterval(playerStateInterval);
}


function updateSongHeader() {
    document.getElementById('songTitle').textContent = currentSong.title;
    document.getElementById('songArtist').textContent = currentSong.artist;

    const languageBadge = document.getElementById('languageBadge');
    const languageIcons = {
        'spanish': '🇪🇸', 'french': '🇫🇷', 'german': '🇩🇪', 'korean': '🇰🇷',
        'japanese': '🇯🇵', 'portuguese': '🇵🇹', 'italian': '🇮🇹'
    };
    languageBadge.innerHTML = `${languageIcons[currentSong.language] || '🌍'} ${capitalize(currentSong.language)}`;

    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = capitalize(currentSong.difficulty);
    difficultyBadge.className = `badge badge-difficulty difficulty-${currentSong.difficulty}`;

    document.title = `${currentSong.title} - Learn - Polyphony`;

    const songHeaderImage = document.querySelector('.song-header-image');
    if (currentSong.album_art_url && songHeaderImage) {
        songHeaderImage.innerHTML = `<img src="${currentSong.album_art_url}" alt="${currentSong.title}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
    }
}


function initializeLyrics() {
    const lyricsPanel = document.getElementById('lyricsPanel');
    lyricsPanel.innerHTML = '';

    if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
        lyricsPanel.innerHTML = '<p class="text-muted text-center">No lyrics available for this song.</p>';
        return;
    }

    currentSong.lyrics.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'lyric-line';
        lineDiv.dataset.index = index;
        lineDiv.dataset.timestamp = line.timestamp_ms;

        const originalTextDiv = document.createElement('div');
        const words = line.original_text.split(' ');
        words.forEach((word, wordIndex) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'lyric-word';
            wordSpan.textContent = word;
            wordSpan.onclick = (e) => {
                e.stopPropagation();
                handleWordClick(word, line.original_text);
            };
            originalTextDiv.appendChild(wordSpan);
            if (wordIndex < words.length - 1) {
                originalTextDiv.appendChild(document.createTextNode(' '));
            }
        });

        lineDiv.appendChild(originalTextDiv);

        if (line.translated_text) {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'lyric-line-translation';
            translationDiv.textContent = line.translated_text;
            translationDiv.style.display = 'none';
            lineDiv.appendChild(translationDiv);
        }

        lyricsPanel.appendChild(lineDiv);
    });
}


async function handleWordClick(word, sentence) {
    try {
        showTranslationLoading();

        const response = await fetch(`${API_BASE_URL}/translate/word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, language: currentSong.language, sentence })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const translationText = data.translation?.translation || data.translation;
        displayTranslation(word, { translation: translationText });
    } catch (error) {
        console.error('Error translating word:', error);
        showTranslationError();
    }
}

function displayTranslation(word, translation) {
    const translationText = translation.translation || '';
    const panel = document.getElementById('translationPanel');
    panel.innerHTML = `
        <div class="translation-item">
            <div class="translation-word"></div>
            <div class="translation-meaning"></div>
            <button class="btn-save-word" id="saveWordBtn">
                <i class="bi bi-bookmark-plus"></i> Save Word
            </button>
        </div>
    `;
    panel.querySelector('.translation-word').textContent = word;
    panel.querySelector('.translation-meaning').textContent = translationText;
    panel.querySelector('#saveWordBtn').onclick = () => saveWord(word, translationText);
}

async function saveWord(word, translationText) {
    word = word.replace(/[^\p{L}]/gu, '');
    savedWords.add(`${word} = ${translationText}`);
    updateSavedWordsDisplay();

    try {
        const response = await fetch('/api/dashboard/saved-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, translation: translationText, song_id: currentSong.id })
        });
        const data = await response.json();
        showNotification(data.success ? 'Word saved!' : 'Could not save word.', data.success ? 'success' : 'error');
    } catch (error) {
        showNotification('Failed to save word.', 'error');
    }
}

function updateSavedWordsDisplay() {
    const display = document.getElementById('savedWordsDisplay');
    if (savedWords.size === 0) {
        display.innerHTML = '<p class="text-muted text-center">No words saved yet. Click on words to save them!</p>';
        return;
    }
    display.innerHTML = '';
    savedWords.forEach(wordPair => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'saved-word';
        wordDiv.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${wordPair}`;
        display.appendChild(wordDiv);
    });
}


function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function showLoading(message) { console.log('Loading:', message); }
function hideLoading() { console.log('Loading complete'); }
function showError(message) { alert(message); }

function showTranslationLoading() {
    document.getElementById('translationPanel').innerHTML = `
        <div class="text-center text-muted">
            <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
            <p>Translating...</p>
        </div>`;
}

function showTranslationError() {
    document.getElementById('translationPanel').innerHTML = `
        <div class="text-center text-danger">
            <i class="bi bi-exclamation-triangle mb-2" style="font-size:2rem;"></i>
            <p>Translation failed. Please try again.</p>
        </div>`;
}

function showNotification(message, type = 'success') {
    console.log(`[${type}] ${message}`);
}

window.addEventListener('beforeunload', () => {
    clearInterval(playerStateInterval);
    if (spotifyPlayer) spotifyPlayer.disconnect();
});

window.addEventListener('DOMContentLoaded', init);