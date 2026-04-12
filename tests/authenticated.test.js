const request = require('supertest');
const app = require('../app');
const db = require('../database');
const bcrypt = require('bcrypt');

// Create a test user in the database before any tests run
beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);
    await db.query(
        `INSERT INTO users (first_name, last_name, username, email, password)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        ['Test', 'User', 'testuser_jest', 'jest@polyphony.test', hashedPassword]
    );
});

// Delete the test user and close the database connection when tests finish
afterAll(async () => {
    const userResult = await db.query(
        `SELECT user_id FROM users WHERE email = 'jest@polyphony.test'`
    );
    if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].user_id;
        await db.query(`DELETE FROM saved_words WHERE user_id = $1`, [userId]);
        await db.query(`DELETE FROM user_song_progress WHERE user_id = $1`, [userId]);
        await db.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
    }
    await db.pool.end();
});

// Logs in and returns a session agent that stays logged in between requests
async function getLoggedInAgent() {
    const agent = request.agent(app);
    await agent.post('/login').send({
        email: 'jest@polyphony.test',
        password: 'TestPassword123'
    });
    return agent;
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
describe('Login', () => {

    // A correct email and password should log the user in
    test('Succeeds with correct credentials', async () => {
        const res = await request(app).post('/login').send({
            email: 'jest@polyphony.test',
            password: 'TestPassword123'
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // After logging in the API should know who the user is
    test('Current user endpoint returns correct username after login', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/current-user');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.username).toBe('testuser_jest');
    });

});

// ─────────────────────────────────────────────
// PROTECTED PAGES
// ─────────────────────────────────────────────
describe('Protected Pages Load After Login', () => {

    // A logged in user should reach the dashboard, not be sent away
    test('Dashboard loads for logged in user', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/dashboard.html');
        expect(res.statusCode).toBe(200);
    });

    // A logged in user should be able to reach their profile
    test('Profile loads for logged in user', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/profile');
        expect(res.statusCode).toBe(200);
    });

    // A logged in user should be able to open the learn page
    test('Learn page loads for logged in user', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/learn.html');
        expect(res.statusCode).toBe(200);
    });

});

// ─────────────────────────────────────────────
// SONG LOADING
// ─────────────────────────────────────────────
describe('Song Loading', () => {

    // Loading a song should return the song details and its lyrics
    test('Song loads with title and lyrics', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/songs/1');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.song).toHaveProperty('title');
        expect(Array.isArray(res.body.lyrics)).toBe(true);
        expect(res.body.lyrics.length).toBeGreaterThan(0);
    });

    // Every lyric line needs a timestamp so the karaoke syncing works
    test('Lyrics have timestamps for syncing', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/songs/1');
        const firstLine = res.body.lyrics[0];
        expect(firstLine).toHaveProperty('timestamp_ms');
        expect(typeof firstLine.timestamp_ms).toBe('number');
    });

    // Lyric lines need both the original text and a translation
    test('Lyrics have original and translated text', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/songs/1');
        const firstLine = res.body.lyrics[0];
        expect(firstLine).toHaveProperty('original_text');
        expect(firstLine).toHaveProperty('translated_text');
    });

    // A song ID that doesn't exist should return a clear not found error
    test('Returns 404 for a song that does not exist', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/songs/999999');
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

});

// ─────────────────────────────────────────────
// VOCABULARY SAVING
// ─────────────────────────────────────────────
describe('Saving Vocabulary', () => {

    // Clicking a word and saving it should succeed
    test('Saves a word successfully', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.post('/api/dashboard/saved-words').send({
            word: 'pollito',
            translation: 'chick',
            song_id: 1
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // A saved word should show up in the vocabulary list on the dashboard.
    // Your API returns the list directly as res.body, with each word under w.word
    test('Saved word appears in the vocabulary list', async () => {
        const agent = await getLoggedInAgent();
        await agent.post('/api/dashboard/saved-words').send({
            word: 'maíz',
            translation: 'corn',
            song_id: 1
        });
        const res = await agent.get('/api/dashboard/saved-words');
        expect(res.statusCode).toBe(200);
        // Try both response shapes in case your API wraps the array or returns it directly
        const words = res.body.words || res.body.savedWords || res.body;
        const found = Array.isArray(words) && words.some(w =>
            w.word === 'maíz' || w.original_word === 'maíz'
        );
        expect(found).toBe(true);
    });

    // Sending a save request with nothing in it should be rejected
    test('Rejects a save request with missing fields', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.post('/api/dashboard/saved-words').send({});
        expect([400, 500]).toContain(res.statusCode);
    });

});

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
describe('Dashboard Stats', () => {

    // The stats card on the dashboard needs a word count to display.
    // Your API returns this as "savedWords" (e.g. { savedWords: 2, songsCompleted: 0 })
    test('Stats include a saved words count', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/dashboard/stats');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('savedWords');
        expect(typeof res.body.savedWords).toBe('number');
    });

    // Stats should also include a songs completed count
    test('Stats include a songs completed count', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/dashboard/stats');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('songsCompleted');
    });

    // The recently played section needs an array of songs to show.
    // Your API returns the array directly in res.body (not wrapped in a key)
    test('Recent songs returns an array', async () => {
        const agent = await getLoggedInAgent();
        const res = await agent.get('/api/dashboard/recent-songs');
        expect(res.statusCode).toBe(200);
        // Try both shapes in case your API wraps the array or returns it directly
        const songs = res.body.songs || res.body.recentSongs || res.body;
        expect(Array.isArray(songs)).toBe(true);
    });

});

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
describe('Logout', () => {

    // After logging out the session should be gone and the API should say so
    test('Session is cleared after logout', async () => {
        const agent = await getLoggedInAgent();

        // Confirm we are logged in
        const before = await agent.get('/api/current-user');
        expect(before.statusCode).toBe(200);

        // Log out
        await agent.get('/logout');

        // Session should now be invalid
        const after = await agent.get('/api/current-user');
        expect(after.statusCode).toBe(401);
    });

});