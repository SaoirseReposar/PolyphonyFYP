const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});


app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});


app.listen(PORT, () => {
    console.log(`Polyphony website running at http://localhost:${PORT}`);
});
