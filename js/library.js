
document.addEventListener('DOMContentLoaded', function() {


    document.querySelectorAll('a[href*="learn.html"]').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const dest = this.getAttribute('href');
            const res = await fetch('/api/current-user');
            const data = await res.json();
            window.location.href = data.success ? dest : '/register';
        });
    });


    let currentUserId = null;

const spotifyBtn = document.getElementById('connectSpotifyBtn');

async function initSpotifyButton() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    const userResponse = await fetch('/api/current-user');
    const userData = await userResponse.json();

    if (!userData.success) {
        spotifyBtn.onclick = () => window.location.href = '/register';
        return;
    }

    currentUserId = userData.user.user_id;

    if (accessToken) {
        localStorage.setItem(`spotify_access_token_${currentUserId}`, accessToken);
        if (refreshToken) localStorage.setItem(`spotify_refresh_token_${currentUserId}`, refreshToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        setConnectedState();
    } else {
        const token = localStorage.getItem(`spotify_access_token_${currentUserId}`);
        if (token) {
            const valid = await checkTokenValidity(token);
            if (valid) {
                setConnectedState();
            } else {
                localStorage.removeItem(`spotify_access_token_${currentUserId}`);
                setDisconnectedState();
            }
        } else {
            setDisconnectedState();
        }
    }
}

function setConnectedState() {
    spotifyBtn.textContent = 'Go to Spotify';
    spotifyBtn.style.background = '#1DB954';
    spotifyBtn.style.color = 'white';
    spotifyBtn.onclick = () => window.location.href = '/spotifyplaylists.html';
}

function setDisconnectedState() {
    spotifyBtn.innerHTML = '<i class="bi bi-spotify me-2"></i> Connect Spotify';
    spotifyBtn.onclick = () => window.location.href = '/spotify/login';
}

async function checkTokenValidity(token) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok;
    } catch { return false; }
}

initSpotifyButton();
    
    
    const songCards = document.querySelectorAll('.song-card');
    
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterButton = document.querySelector('.btn-filter');
    
    const searchInput = document.querySelector('.search-input');
    
    let activeFilters = {
        language: new Set(),
        difficulty: new Set()
    };
    
    filterCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const filterType = checkbox.dataset.filterType;
            const filterValue = checkbox.dataset.filterValue;
            activeFilters[filterType].add(filterValue);
        }
    });
    
    function updateFilterButtonText() {
        const activeLanguages = Array.from(activeFilters.language);
        const activeDifficulties = Array.from(activeFilters.difficulty);
        
        let filterText = 'Filter By: ';
        
        if (activeLanguages.length === 0) {
            filterText += 'all languages';
        } else if (activeLanguages.length === 4) {
            filterText += 'all languages';
        } else {
            filterText += activeLanguages.join(', ');
        }
        
        filterText += ', ';
        
        if (activeDifficulties.length === 0) {
            filterText += 'all difficulties';
        } else if (activeDifficulties.length === 3) {
            filterText += 'all difficulties';
        } else {
            filterText += activeDifficulties.join(', ');
        }
        
        const buttonIcon = '<i class="bi bi-funnel me-2"></i>';
        filterButton.innerHTML = buttonIcon + filterText;
    }
    
    function filterSongs() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        
        songCards.forEach(card => {
            const cardLanguage = card.dataset.language;
            const cardDifficulty = card.dataset.difficulty;
            
            const titleElement = card.querySelector('.song-title');
            const artistElement = card.querySelector('.song-artist');
            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            const artist = artistElement ? artistElement.textContent.toLowerCase() : '';
            
            const matchesLanguage = activeFilters.language.size === 0 || activeFilters.language.has(cardLanguage);
            
            const matchesDifficulty = activeFilters.difficulty.size === 0 || activeFilters.difficulty.has(cardDifficulty);
            
            const matchesSearch = searchTerm === '' || 
                                 title.includes(searchTerm) || 
                                 artist.includes(searchTerm);
            
            const cardColumn = card.closest('.col-md-6');
            if (matchesLanguage && matchesDifficulty && matchesSearch) {
                cardColumn.style.display = '';
                visibleCount++;
            } else {
                cardColumn.style.display = 'none';
            }
        });
        
        showNoResultsMessage(visibleCount);
    }
    
    function showNoResultsMessage(visibleCount) {
        const existingMessage = document.querySelector('.no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (visibleCount === 0) {
            const songsSection = document.querySelector('.songs-section .container');
            const message = document.createElement('div');
            message.className = 'no-results-message text-center py-5';
            message.innerHTML = `
                <div class="mb-3">
                    <i class="bi bi-music-note-list" style="font-size: 3rem; color: #667eea;"></i>
                </div>
                <h3 style="color: #1a1a1a;">No songs found</h3>
                <p style="color: #666;">Try adjusting your filters or search terms</p>
            `;
            songsSection.appendChild(message);
        }
    }
    
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const filterType = this.dataset.filterType;
            const filterValue = this.dataset.filterValue;
            
            if (this.checked) {
                activeFilters[filterType].add(filterValue);
            } else {
                activeFilters[filterType].delete(filterValue);
            }
            
            updateFilterButtonText();
            filterSongs();
        });
    });
    
    clearFiltersBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        filterCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            const filterType = checkbox.dataset.filterType;
            const filterValue = checkbox.dataset.filterValue;
            activeFilters[filterType].add(filterValue);
        });
        
        updateFilterButtonText();
        filterSongs();
    });
    
    searchInput.addEventListener('input', function() {
        filterSongs();
    });
    
    const dropdownMenu = document.querySelector('.filter-menu');
    dropdownMenu.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-checkbox') || 
            e.target.tagName === 'LABEL') {
            e.stopPropagation();
        }
    });
    
    updateFilterButtonText();
    filterSongs();

    
});



