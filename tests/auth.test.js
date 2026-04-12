const request = require('supertest');
const app = require('../app');

// Checks that the registration form catches bad input before it hits the database
describe('Registration Validation', () => {

    // Passwords that don't match should be rejected straight away
    test('Fails if passwords do not match', async () => {
        const res = await request(app).post('/register').send({
            firstName: 'Test',
            surname: 'User',
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'wrongpassword'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/passwords do not match/i);
    });

    // Passwords under 8 characters should not be accepted
    test('Fails if password is too short', async () => {
        const res = await request(app).post('/register').send({
            firstName: 'Test',
            surname: 'User',
            username: 'testuser2',
            email: 'test2@example.com',
            password: 'short',
            confirmPassword: 'short'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    // A form missing required fields should never create an account
    test('Fails if required fields are missing', async () => {
        const res = await request(app).post('/register').send({
            email: 'incomplete@example.com',
            password: 'password123'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

});

// Checks that login rejects bad attempts correctly
describe('Login Validation', () => {

    // Wrong email or password should always be refused
    test('Fails with wrong credentials', async () => {
        const res = await request(app).post('/login').send({
            email: 'nobody@example.com',
            password: 'wrongpassword'
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    // Submitting a completely empty login form should be refused
    test('Fails with empty form', async () => {
        const res = await request(app).post('/login').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

});