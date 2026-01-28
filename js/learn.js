// js/learn.js - Song Learning Page Logic
const API_BASE_URL = 'http://localhost:4000/api';

// Global state
let currentSong = null;
let savedWords = new Set();
let currentLineIndex = -1;

// Spotify Player (using HTML5 audio for preview, or Spotify SDK for full tracks)
const audioPlayer = document.getElementById('audioPlayer');

/**
 * Initialize the page when it loads
 */
async function init() {
    // Get song ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');
    
    if (!songId) {
        showError('No song selected. Please go back to the library.');
        return;
    }
    
    await loadSong(songId);
}

/**
 * Load song data from API
 */
async function loadSong(songId) {
    try {
        showLoading('Loading song...');
        
        const response = await fetch(`${API_BASE_URL}/songs/${songId}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        currentSong = data.song;
        
        // Update page UI
        updateSongHeader();
        initializeLyrics();
        setupAudioPlayer();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading song:', error);
        showError('Failed to load song. Please try again.');
    }
}

/**
 * Update song header with metadata
 */
function updateSongHeader() {
    document.getElementById('songTitle').textContent = currentSong.title;
    document.getElementById('songArtist').textContent = currentSong.artist;
    
    // Update language badge
    const languageBadge = document.getElementById('languageBadge');
    const languageIcons = {
        'spanish': '🇪🇸',
        'french': '🇫🇷',
        'german': '🇩🇪',
        'korean': '🇰🇷'
    };
    languageBadge.innerHTML = `${languageIcons[currentSong.language] || '🌍'} ${capitalize(currentSong.language)}`;
    
    // Update difficulty badge
    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = capitalize(currentSong.difficulty);
    difficultyBadge.className = `badge badge-difficulty difficulty-${currentSong.difficulty}`;
    
    // Update page title
    document.title = `${currentSong.title} - Learn - Polyphony`;

    const songHeaderImage = document.querySelector('.song-header-image');
    if (currentSong.album_art_url && songHeaderImage) {
        songHeaderImage.innerHTML = `<img src="${currentSong.album_art_url}" alt="${currentSong.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
    }
}

/**
 * Initialize lyrics panel with clickable words
 */
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
        
        // Create container for original text
        const originalTextDiv = document.createElement('div');
        
        // Split line into words and make them clickable
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
            
            // Add space after word (except last word)
            if (wordIndex < words.length - 1) {
                originalTextDiv.appendChild(document.createTextNode(' '));
            }
        });
        
        lineDiv.appendChild(originalTextDiv);
        
        // Add translation below the original text (hidden by default with inline style)
        if (line.translated_text) {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'lyric-line-translation';
            translationDiv.textContent = line.translated_text;
            translationDiv.style.display = 'none'; // Hide by default with inline style
            lineDiv.appendChild(translationDiv);
        }
        
        lyricsPanel.appendChild(lineDiv);
    });
}

/**
 * Setup audio player
 */
function setupAudioPlayer() {
    // Use local audio file
audioPlayer.src = `audio/los-pollitos-dicen.mp3`; // relative path from your HTML page
audioPlayer.load();


    // Reset UI
    document.getElementById('playBtn').innerHTML =
        '<i class="bi bi-play-fill"></i>';

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', onSongEnd);
}


/**
 * Toggle play/pause
 */
function togglePlay() {
    const playBtn = document.getElementById('playBtn');
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
    } else {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    }
}

/**
 * Restart song
 */
function restart() {
    audioPlayer.currentTime = 0;
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
    });
    audioPlayer.play();
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-pause-fill"></i>';
}

/**
 * Change playback speed
 */
function changeSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentSpeed = audioPlayer.playbackRate;
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    
    audioPlayer.playbackRate = speeds[nextIndex];
    document.getElementById('speedDisplay').textContent = speeds[nextIndex] + 'x';
}

/**
 * Update progress bar
 */
function updateProgress() {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    // Update current time display
    document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
    
    // Update lyric highlight
    updateLyricHighlight();
}

/**
 * Update duration display
 */
function updateDuration() {
    document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
}

/**
 * Seek to position in song
 */
function seek(event) {
    const progressBar = event.currentTarget;
    const clickX = event.offsetX;
    const width = progressBar.offsetWidth;
    audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
}

/**
 * Update highlighted lyric line
 */
function updateLyricHighlight() {
    const currentTimeMs = audioPlayer.currentTime * 1000;
    const lyrics = currentSong.lyrics;
    
    for (let i = 0; i < lyrics.length; i++) {
        const currentLyric = lyrics[i];
        const nextLyric = lyrics[i + 1];
        
        const startTime = currentLyric.timestamp_ms;
        const endTime = nextLyric ? nextLyric.timestamp_ms : Infinity;
        
        if (currentTimeMs >= startTime && currentTimeMs < endTime) {
            if (currentLineIndex !== i) {
                // Remove active class and hide translations from all lines
                document.querySelectorAll('.lyric-line').forEach(line => {
                    line.classList.remove('active');
                    const translation = line.querySelector('.lyric-line-translation');
                    if (translation) {
                        translation.style.display = 'none';
                    }
                });
                
                // Add active class to current line
                const currentLine = document.querySelector(`[data-index="${i}"]`);
                if (currentLine) {
                    currentLine.classList.add('active');
                    currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Show translation for active line
                    const translation = currentLine.querySelector('.lyric-line-translation');
                    if (translation) {
                        translation.style.display = 'block';
                    }
                }
                
                currentLineIndex = i;
            }
            break;
        }
    }
}


/**
 * Handle word click
 */
async function handleWordClick(word, sentence) {
    try {
        showTranslationLoading();
        
        const response = await fetch(`${API_BASE_URL}/translate/word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: word,
                language: currentSong.language,
                sentence: sentence
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        displayTranslation(word, data.translation);
    } catch (error) {
        console.error('Error translating word:', error);
        showTranslationError();
    }
}

/**
 * Display word translation
 */
function displayTranslation(word, translation) {
    const translationPanel = document.getElementById('translationPanel');
    
    translationPanel.innerHTML = `
        <div class="translation-item">
            <div class="translation-word">${word}</div>
            <div class="translation-meaning">${translation.translation}</div>
            <button class="btn-save-word" onclick="saveWord('${word}', '${translation.translation}', ${translation.id})">
                <i class="bi bi-bookmark-plus"></i> Save Word
            </button>
        </div>
    `;
}

/**
 * Save word to vocabulary
 */
async function saveWord(word, translationText, wordId) {
    try {
        const response = await fetch(`${API_BASE_URL}/words/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: 1, // Replace with actual user ID from auth
                word_id: wordId,
                song_id: currentSong.id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            savedWords.add(`${word} = ${translationText}`);
            updateSavedWordsDisplay();
            showNotification('Word saved!');
        }
    } catch (error) {
        console.error('Error saving word:', error);
        showNotification('Failed to save word', 'error');
    }
}

/**
 * Update saved words display
 */
function updateSavedWordsDisplay() {
    const display = document.getElementById('savedWordsDisplay');
    
    if (savedWords.size === 0) {
        display.innerHTML = '<p class="text-muted text-center">No words saved yet. Click on words and save them to build your vocabulary!</p>';
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

/**
 * Handle song end
 */
function onSongEnd() {
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-play-fill"></i>';
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
    });
}

// Utility functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showLoading(message) {
    // Implement loading indicator
    console.log('Loading:', message);
}

function hideLoading() {
    // Hide loading indicator
    console.log('Loading complete');
}

function showError(message) {
    alert(message); // Replace with better UI
}

function showTranslationLoading() {
    document.getElementById('translationPanel').innerHTML = `
        <div class="text-center text-muted">
            <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
            <p>Translating...</p>
        </div>
    `;
}

function showTranslationError() {
    document.getElementById('translationPanel').innerHTML = `
        <div class="text-center text-danger">
            <i class="bi bi-exclamation-triangle mb-2" style="font-size: 2rem;"></i>
            <p>Translation failed. Please try again.</p>
        </div>
    `;
}

function showNotification(message, type = 'success') {
    // Implement toast notification
    console.log(`[${type}] ${message}`);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);