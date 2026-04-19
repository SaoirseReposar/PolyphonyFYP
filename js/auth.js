
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const registrationFormElement = document.getElementById('registrationForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const switchToLoginLink = document.getElementById('switchToLoginLink');
    const switchToRegisterLink = document.getElementById('switchToRegisterLink');

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear_storage') === 'true') {
        localStorage.clear();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    switchToLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        switchToLogin();
    });

    switchToRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        switchToRegister();
    });

    registrationFormElement.addEventListener('submit', handleRegistration);
    loginFormElement.addEventListener('submit', handleLogin);
});



function switchToLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    hideAlert();
}


function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    hideAlert();
}

/**
 * Show alert message to user
 * @param {string} message 
 * @param {string} type
 */
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.classList.remove('d-none');
}


function hideAlert() {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.classList.add('d-none');
}

/**
 * Handle registration form submission
 * @param {Event} e 
 */
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1500);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        showAlert('An error occurred. Please try again.', 'danger');
        console.error('Registration error:', error);
    }
}

/**
 * Handle login form submission
 * @param {Event} e 
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1500);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        showAlert('An error occurred. Please try again.', 'danger');
        console.error('Login error:', error);
    }
}