// Profile Page JavaScript
// This file loads and displays the logged-in user's information

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
});

/**
 * Load the current user's profile information
 */
async function loadUserProfile() {
    try {
        // Fetch current user data from the server
        const response = await fetch('/api/current-user');
        const result = await response.json();

        if (result.success && result.user) {
            // User is logged in, populate the page with their data
            populateUserData(result.user);
        } else {
            // User is not logged in, redirect to register page
            window.location.href = '/register';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Redirect to register page on error
        window.location.href = '/register';
    }
}

/**
 * Populate the page with user data
 * @param {Object} user - User object from the server
 */
function populateUserData(user) {
    // Update navbar with user's first name
    const userBadge = document.querySelector('.btn-get-started');
    if (userBadge) {
        userBadge.textContent = user.first_name;
        userBadge.href = '/profile';
    }

    // Update sidebar avatar with initials
    const avatarCircle = document.querySelector('.avatar-circle');
    if (avatarCircle) {
        const initials = getInitials(user.first_name, user.last_name);
        avatarCircle.textContent = initials;
    }

    // Update sidebar name
    const sidebarName = document.querySelector('.profile-avatar h5');
    if (sidebarName) {
        sidebarName.textContent = `${user.first_name} ${user.last_name}`;
    }

    // Update form fields
    updateFormField('firstName', user.first_name);
    updateFormField('lastName', user.last_name);
    updateFormField('email', user.email);
    updateFormField('username', user.username);
}

/**
 * Get initials from first and last name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Initials (e.g., "JD")
 */
function getInitials(firstName, lastName) {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
}

/**
 * Update a form field value
 * @param {string} fieldId - ID of the input field
 * @param {string} value - Value to set
 */
function updateFormField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value) {
        field.value = value;
    }
}