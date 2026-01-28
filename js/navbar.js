// Navbar JavaScript
// This file checks if a user is logged in and updates the navbar on all pages

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    checkUserStatus();
});

/**
 * Check if user is logged in and update navbar accordingly
 */
async function checkUserStatus() {
    try {
        // Fetch current user data from the server
        const response = await fetch('/api/current-user');
        const result = await response.json();

        if (result.success && result.user) {
            // User is logged in, update navbar to show their name
            updateNavbarForLoggedInUser(result.user);
        } else {
            // User is not logged in, show "Get Started" button
            updateNavbarForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        // If there's an error, show the default logged-out navbar
        updateNavbarForLoggedOutUser();
    }
}

/**
 * Update navbar to show logged-in user's name
 * @param {Object} user - User object from the server
 */
function updateNavbarForLoggedInUser(user) {
    // Find the navbar button area
    const navbarEnd = document.querySelector('.navbar-nav').parentElement;
    
    // Check if "Get Started" button exists
    const getStartedBtn = navbarEnd.querySelector('.btn-get-started');
    
    if (getStartedBtn) {
        // Remove "Get Started" button
        getStartedBtn.remove();
        
        // Create user badge with same styling as Get Started button
        const userBadge = document.createElement('a');
        userBadge.className = 'btn btn-get-started ms-lg-3';
        userBadge.textContent = user.first_name;
        userBadge.href = '/profile';
        userBadge.style.cursor = 'pointer';
        
        // Add user badge to navbar
        navbarEnd.appendChild(userBadge);
    }
}

/**
 * Update navbar to show "Get Started" button for logged-out users
 */
function updateNavbarForLoggedOutUser() {
    // Find the navbar button area
    const navbarEnd = document.querySelector('.navbar-nav').parentElement;
    
    // Check if user badge exists (user was logged in but session expired)
    const userBadge = navbarEnd.querySelector('.user-badge');
    
    if (userBadge) {
        // Remove user badge
        userBadge.remove();
        
        // Add "Get Started" button back
        const getStartedBtn = document.createElement('a');
        getStartedBtn.className = 'btn btn-get-started ms-lg-3';
        getStartedBtn.href = '/register';
        getStartedBtn.textContent = 'Get Started';
        
        navbarEnd.appendChild(getStartedBtn);
    }
}