
document.addEventListener('DOMContentLoaded', function() {
    checkUserStatus();
});


async function checkUserStatus() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();

        if (result.success && result.user) {
            updateNavbarForLoggedInUser(result.user);
        } else {
            updateNavbarForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        updateNavbarForLoggedOutUser();
    }
}

/**
 * @param {Object} user - User object from the server
 */
function updateNavbarForLoggedInUser(user) {
    const navbarEnd = document.querySelector('.navbar-nav').parentElement;
    const getStartedBtn = navbarEnd.querySelector('.btn-get-started');
    if (getStartedBtn) {
        getStartedBtn.remove();
        const userBadge = document.createElement('a');
        userBadge.className = 'btn btn-get-started ms-lg-3';
        userBadge.textContent = user.first_name;
        userBadge.href = '/profile';
        navbarEnd.appendChild(userBadge);
    }

    const navLinks = document.querySelectorAll('.navbar-nav .nav-item a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'learn.html' || link.getAttribute('href') === 'dashboard.html') {
            link.closest('.nav-item').style.display = '';
        }
    });
}

function updateNavbarForLoggedOutUser() {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-item a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'learn.html' || link.getAttribute('href') === 'dashboard.html') {
            link.closest('.nav-item').style.display = 'none';
        }
    });
}