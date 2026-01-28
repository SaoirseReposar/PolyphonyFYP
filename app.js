// Updated app.js with authentication routes
const express = require('express');
const path = require('path');
const session = require('express-session');
const { registerUser, loginUser } = require('./auth');

const app = express();
const PORT = 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration for maintaining user login state
app.use(session({
    secret: 'your-secret-key-change-this',  // Change this to a random string in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24  // 24 hours
    }
}));

// Static file directories
app.use(express.static(__dirname));



// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/register');
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.redirect('/');
});

app.get('/learn.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'learn.html'));
});

app.get('/library.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'library.html'));
});


app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});


// Registration POST route
app.post('/register', async (req, res) => {
    const { firstName, surname, username, email, password, confirmPassword } = req.body;

    // Validate that passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Passwords do not match' 
        });
    }

    // Validate password length
    if (password.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 8 characters' 
        });
    }

    // Register the user
    const result = await registerUser({
        firstName,
        lastName: surname,
        username,
        email,
        password
    });

    if (result.success) {
        // Store user in session
        req.session.user = result.user;
        res.status(200).json({ 
            success: true, 
            message: result.message,
            redirectUrl: '/profile'
        });
    } else {
        res.status(400).json({ 
            success: false, 
            message: result.message 
        });
    }
});

// Login POST route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Login the user
    const result = await loginUser(email, password);

    if (result.success) {
        // Store user in session
        req.session.user = result.user;
        res.status(200).json({ 
            success: true, 
            message: result.message,
            redirectUrl: '/profile'
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: result.message 
        });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/register');
    });
});

// API route to get current user info
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json({ 
            success: true, 
            user: req.session.user 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Polyphony website running at http://localhost:${PORT}`);
});