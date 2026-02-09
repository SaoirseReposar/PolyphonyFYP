const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');
const { registerUser, loginUser } = require('./auth');
const db = require('./database');
const translationService = require('./services/translationService');
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
        maxAge: 1000 * 60 * 60 * 24  
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
app.get('/spotify/login', isAuthenticated, (req, res) => {
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

app.get('/spotify/callback', isAuthenticated, async (req, res) => {
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

app.get('/spotifyplaylists.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'spotifyplaylists.html'));
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
        res.redirect('/register?clear_storage=true');
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

app.post('/api/translate/word', async (req, res) => {
    try {
        const { word, language } = req.body;

        if (!word || !language) {
            return res.status(400).json({
                success: false,
                error: 'Missing word or language'
            });
        }

        const cleanedWord = word.replace(/[^\p{L}]/gu, '');

        const translations = await translationService.translateBatch(
            [cleanedWord],
            language,
            'EN-US'
        );

        res.json({
            success: true,
            translation: {
                id: Date.now(),
                translation: translations[0]
            }
        });

    } catch (error) {
        console.error('Word translation error:', error);
        res.status(500).json({
            success: false,
            error: 'Translation failed'
        });
    }
});


app.get('/api/songs/:id', async (req, res) => {
    try {
        const songId = req.params.id;

        const songResult = await db.query(
            `SELECT * FROM songs WHERE id = $1`,
            [songId]
        );

        if (songResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Song not found' });
        }

        const song = songResult.rows[0];

        const lyricsResult = await db.query(
            `SELECT * FROM lyrics WHERE song_id = $1 ORDER BY line_number ASC`,
            [songId]
        );

        const lyrics = lyricsResult.rows.map(l => ({
            line_number: l.line_number,
            timestamp_ms: l.timestamp_ms,
            original_text: l.original_text,
            translated_text: l.translated_text
        }));

        res.json({
            success: true,
            song,
            lyrics
        });

    } catch (error) {
        console.error('Error loading song:', error);
        res.status(500).json({ success: false, error: 'Failed to load song' });
    }
});


app.listen(PORT, () => {
    console.log(` Website Running`);
  
});