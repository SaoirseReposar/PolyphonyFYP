
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
});


async function loadUserProfile() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();

        if (result.success && result.user) {
            populateUserData(result.user);
        } else {
            window.location.href = '/register';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        window.location.href = '/register';
    }
}

/**
 * Populate the page with user data
 * @param {Object} user 
 */
function populateUserData(user) {
    const userBadge = document.querySelector('.btn-get-started');
    if (userBadge) {
        userBadge.textContent = user.first_name;
        userBadge.href = '/profile';
    }

    const avatarCircle = document.querySelector('.avatar-circle');
    if (avatarCircle) {
        const initials = getInitials(user.first_name, user.last_name);
        avatarCircle.textContent = initials;
    }

    const sidebarName = document.querySelector('.profile-avatar h5');
    if (sidebarName) {
        sidebarName.textContent = `${user.first_name} ${user.last_name}`;
    }

    updateFormField('firstName', user.first_name);
    updateFormField('lastName', user.last_name);
    updateFormField('email', user.email);
    updateFormField('username', user.username);
}

/**
 * Get initials from first and last name
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string} 
 */
function getInitials(firstName, lastName) {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
}

/**
 * Update a form field value
 * @param {string} fieldId 
 * @param {string} value 
 */
function updateFormField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value) {
        field.value = value;
    }
}