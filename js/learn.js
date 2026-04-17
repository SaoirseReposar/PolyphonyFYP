const API_BASE_URL = '/api';

let currentSong = null;
let savedWords = new Set();
let currentLineIndex = -1;

const audioPlayer = document.getElementById('audioPlayer');


async function init() {
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
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        currentSong = {
    ...data.song,
    lyrics: data.lyrics
};

        
        updateSongHeader();
        initializeLyrics();
        setupAudioPlayer();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading song:', error);
        showError('Failed to load song. Please try again.');
    }
}


function updateSongHeader() {
    document.getElementById('songTitle').textContent = currentSong.title;
    document.getElementById('songArtist').textContent = currentSong.artist;
    
    const languageBadge = document.getElementById('languageBadge');
    const languageIcons = {
        'spanish': '🇪🇸',
        'french': '🇫🇷',
        'german': '🇩🇪',
        'korean': '🇰🇷'
    };
    languageBadge.innerHTML = `${languageIcons[currentSong.language] || '🌍'} ${capitalize(currentSong.language)}`;
    
    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = capitalize(currentSong.difficulty);
    difficultyBadge.className = `badge badge-difficulty difficulty-${currentSong.difficulty}`;
    
    document.title = `${currentSong.title} - Learn - Polyphony`;

    const songHeaderImage = document.querySelector('.song-header-image');
    if (currentSong.album_art_url && songHeaderImage) {
        songHeaderImage.innerHTML = `<img src="${currentSong.album_art_url}" alt="${currentSong.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
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


function setupAudioPlayer() {
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
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio load error - Expected path:', audioPlayer.src);
        showError('Failed to load audio file.');
    });
}


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


function restart() {
    audioPlayer.currentTime = 0;
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
    });
    audioPlayer.play();
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-pause-fill"></i>';
}


function changeSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentSpeed = audioPlayer.playbackRate;
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    
    audioPlayer.playbackRate = speeds[nextIndex];
    document.getElementById('speedDisplay').textContent = speeds[nextIndex] + 'x';
}


function updateProgress() {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
    
    updateLyricHighlight();
}


function updateDuration() {
    document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
}


function seek(event) {
    const progressBar = event.currentTarget;
    const clickX = event.offsetX;
    const width = progressBar.offsetWidth;
    audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
}


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
                document.querySelectorAll('.lyric-line').forEach(line => {
                    line.classList.remove('active');
                    const translation = line.querySelector('.lyric-line-translation');
                    if (translation) {
                        translation.style.display = 'none';
                    }
                });
                
                const currentLine = document.querySelector(`[data-index="${i}"]`);
                if (currentLine) {
                    currentLine.classList.add('active');
                    currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
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


function displayTranslation(word, translation) {
    const translationPanel = document.getElementById('translationPanel');
    
    translationPanel.innerHTML = `
        <div class="translation-item">
            <div class="translation-word">${word}</div>
            <div class="translation-meaning">${translation.translation}</div>
            <button class="btn-save-word" onclick="saveWord('${word}', '${translation.translation}')">
            <i class="bi bi-bookmark-plus"></i> Save Word
            </button>
        </div>
    `;
}


async function saveWord(word, translationText) {
    word = word.replace(/[^\p{L}]/gu, '');
    savedWords.add(`${word} = ${translationText}`);
    updateSavedWordsDisplay();

    try {
        const response = await fetch('/api/dashboard/saved-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: word,
                translation: translationText,
                song_id: currentSong.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Word saved!', 'success');
        } else {
            showNotification('Could not save word. Are you logged in?', 'error');
        }
    } catch (error) {
        console.error('Save word error:', error);
        showNotification('Failed to save word.', 'error');
    }
}



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


function onSongEnd() {
    document.getElementById('playBtn').innerHTML = '<i class="bi bi-play-fill"></i>';
    currentLineIndex = -1;
    document.querySelectorAll('.lyric-line').forEach(line => {
        line.classList.remove('active');
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showLoading(message) {
    console.log('Loading:', message);
}

function hideLoading() {
    console.log('Loading complete');
}

function showError(message) {
    alert(message); 
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
    console.log(`[${type}] ${message}`);
}

window.addEventListener('DOMContentLoaded', init);