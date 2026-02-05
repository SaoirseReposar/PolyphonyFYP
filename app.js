const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');
const { registerUser, loginUser } = require('./auth');

const app = express();
const PORT = 3000;


const SPOTIFY_CLIENT_ID = '5c74a6f691cc4c1cad6c5e8926fbf40d';
const SPOTIFY_CLIENT_SECRET = 'ae4f8d98cb1e4ef287d32f3816bcae3b';
const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/spotify/callback';


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(session({
    secret: 'secretkey',  
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24  // 24 hours
    }
}));

app.use(express.static(__dirname));

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/register');
    }
}

// SPOTIFY OAUTH ROUTES

// Redirect user to Spotify authorization page
app.get('/spotify/login', (req, res) => {
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
        });
    
    res.redirect(authUrl);
});

app.get('/spotify/callback', async (req, res) => {
    const code = req.query.code || null;

    if (!code) {
        return res.redirect('/spotify-connect.html?error=no_code');
    }

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
                }
            }
        );

        const { access_token, refresh_token } = response.data;

        res.redirect('/?' + 
            querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            })
        );

    } catch (error) {
        console.error('Error exchanging code for token:', error.response?.data || error.message);
        res.redirect('/spotify-connect.html?error=token_exchange_failed');
    }
});


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

app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

app.post('/register', async (req, res) => {
    const { firstName, surname, username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Passwords do not match' 
        });
    }

    if (password.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 8 characters' 
        });
    }

    const result = await registerUser({
        firstName,
        lastName: surname,
        username,
        email,
        password
    });

    if (result.success) {
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

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    if (result.success) {
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

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/register');
    });
});

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
    console.log(` Website Running`);
  
});