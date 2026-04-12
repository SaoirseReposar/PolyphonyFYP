const request = require('supertest');
const app = require('../app');

// Checks that public pages load for anyone visiting the site
describe('Public Pages', () => {

    // The homepage should always be accessible
    test('Homepage loads (200)', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
    });

    // The song library is public so people can browse before signing up
    test('Song library loads (200)', async () => {
        const res = await request(app).get('/library');
        expect(res.statusCode).toBe(200);
    });

    // The register page must always be accessible since it's the entry point
    test('Register page loads (200)', async () => {
        const res = await request(app).get('/register');
        expect(res.statusCode).toBe(200);
    });

});

// Checks that pages requiring a login redirect users who are not signed in
describe('Protected Pages Redirect When Not Logged In', () => {

    // The learn page is only for logged in users
    test('Learn page redirects to register', async () => {
        const res = await request(app).get('/learn.html');
        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toBe('/register');
    });

    // The dashboard is personal to each user so it must be locked
    test('Dashboard redirects to register', async () => {
        const res = await request(app).get('/dashboard.html');
        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toBe('/register');
    });

    // The profile page holds user account details so it must be locked
    test('Profile page redirects to register', async () => {
        const res = await request(app).get('/profile');
        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toBe('/register');
    });

    // The Spotify playlists page requires a login to use
    test('Spotify playlists page redirects to register', async () => {
        const res = await request(app).get('/spotifyplaylists.html');
        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toBe('/register');
    });

});