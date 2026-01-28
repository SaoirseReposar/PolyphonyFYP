// Library Page - Filter and Search Functionality

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Get all song cards
    const songCards = document.querySelectorAll('.song-card');
    
    // Get filter elements
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterButton = document.querySelector('.btn-filter');
    
    // Get search element
    const searchInput = document.querySelector('.search-input');
    
    // Track active filters - start empty so all songs show
    let activeFilters = {
        language: new Set(),
        difficulty: new Set()
    };
    
    // Initialize filters based on checked checkboxes
    filterCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const filterType = checkbox.dataset.filterType;
            const filterValue = checkbox.dataset.filterValue;
            activeFilters[filterType].add(filterValue);
        }
    });
    
    // Function to update filter button text
    function updateFilterButtonText() {
        const activeLanguages = Array.from(activeFilters.language);
        const activeDifficulties = Array.from(activeFilters.difficulty);
        
        let filterText = 'Filter By: ';
        
        // Add language filters
        if (activeLanguages.length === 0) {
            filterText += 'all languages';
        } else if (activeLanguages.length === 4) {
            filterText += 'all languages';
        } else {
            filterText += activeLanguages.join(', ');
        }
        
        filterText += ', ';
        
        // Add difficulty filters
        if (activeDifficulties.length === 0) {
            filterText += 'all difficulties';
        } else if (activeDifficulties.length === 3) {
            filterText += 'all difficulties';
        } else {
            filterText += activeDifficulties.join(', ');
        }
        
        // Update button text (keep the icon)
        const buttonIcon = '<i class="bi bi-funnel me-2"></i>';
        filterButton.innerHTML = buttonIcon + filterText;
    }
    
    // Function to filter songs
    function filterSongs() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        
        songCards.forEach(card => {
            const cardLanguage = card.dataset.language;
            const cardDifficulty = card.dataset.difficulty;
            
            // Get song title and artist for search
            const titleElement = card.querySelector('.song-title');
            const artistElement = card.querySelector('.song-artist');
            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            const artist = artistElement ? artistElement.textContent.toLowerCase() : '';
            
            // Check if card matches filters
            // If no languages selected, show all languages. Otherwise, check if card's language is selected
            const matchesLanguage = activeFilters.language.size === 0 || activeFilters.language.has(cardLanguage);
            
            // If no difficulties selected, show all difficulties. Otherwise, check if card's difficulty is selected
            const matchesDifficulty = activeFilters.difficulty.size === 0 || activeFilters.difficulty.has(cardDifficulty);
            
            // Check search match
            const matchesSearch = searchTerm === '' || 
                                 title.includes(searchTerm) || 
                                 artist.includes(searchTerm);
            
            // Show or hide the card's parent column
            const cardColumn = card.closest('.col-md-6');
            if (matchesLanguage && matchesDifficulty && matchesSearch) {
                cardColumn.style.display = '';
                visibleCount++;
            } else {
                cardColumn.style.display = 'none';
            }
        });
        
        // Show "no results" message if needed
        showNoResultsMessage(visibleCount);
    }
    
    // Function to show/hide "no results" message
    function showNoResultsMessage(visibleCount) {
        // Remove existing message if any
        const existingMessage = document.querySelector('.no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Add message if no results
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
    
    // Add event listeners to checkboxes
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
    
    // Add event listener to clear filters button
    clearFiltersBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check all checkboxes (to show everything)
        filterCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            const filterType = checkbox.dataset.filterType;
            const filterValue = checkbox.dataset.filterValue;
            activeFilters[filterType].add(filterValue);
        });
        
        updateFilterButtonText();
        filterSongs();
    });
    
    // Add event listener to search input
    searchInput.addEventListener('input', function() {
        filterSongs();
    });
    
    // Prevent dropdown from closing when clicking on checkboxes
    const dropdownMenu = document.querySelector('.filter-menu');
    dropdownMenu.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-checkbox') || 
            e.target.tagName === 'LABEL') {
            e.stopPropagation();
        }
    });
    
    // Initialize - run filter once on page load
    updateFilterButtonText();
    filterSongs();
});