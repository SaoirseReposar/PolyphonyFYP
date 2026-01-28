// Authentication JavaScript for Register/Login Page
// This file handles form switching and authentication requests

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const registrationFormElement = document.getElementById('registrationForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const switchToLoginLink = document.getElementById('switchToLoginLink');
    const switchToRegisterLink = document.getElementById('switchToRegisterLink');

    // Add event listeners for form switching
    switchToLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        switchToLogin();
    });

    switchToRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        switchToRegister();
    });

    // Add event listeners for form submissions
    registrationFormElement.addEventListener('submit', handleRegistration);
    loginFormElement.addEventListener('submit', handleLogin);
});

/**
 * Switch to login form view
 */
function switchToLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    hideAlert();
}

/**
 * Switch to register form view
 */
function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    hideAlert();
}

/**
 * Show alert message to user
 * @param {string} message - Message to display
 * @param {string} type - Alert type (success, danger, warning, etc.)
 */
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.classList.remove('d-none');
}

/**
 * Hide alert message
 */
function hideAlert() {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.classList.add('d-none');
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submit event
 */
async function handleRegistration(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        // Send registration request to server
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            showAlert(result.message, 'success');
            // Redirect to profile page after short delay
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1500);
        } else {
            // Show error message
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        // Show generic error message
        showAlert('An error occurred. Please try again.', 'danger');
        console.error('Registration error:', error);
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        // Send login request to server
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            showAlert(result.message, 'success');
            // Redirect to profile page after short delay
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1500);
        } else {
            // Show error message
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        // Show generic error message
        showAlert('An error occurred. Please try again.', 'danger');
        console.error('Login error:', error);
    }
}