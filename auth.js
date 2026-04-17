// Handles user registration and login

const bcrypt = require('bcrypt');
const pool = require('./database');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData 
 * @returns {Object} 
 */
async function registerUser(userData) {
    const { firstName, lastName, username, email, password } = userData;

    try {
        const emailCheck = await pool.query(
            'SELECT email FROM Users WHERE email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            return { success: false, message: 'Email already registered' };
        }

        const usernameCheck = await pool.query(
            'SELECT username FROM Users WHERE username = $1',
            [username]
        );

        if (usernameCheck.rows.length > 0) {
            return { success: false, message: 'Username already taken' };
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO Users (first_name, last_name, username, email, password) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING user_id, first_name, last_name, username, email`,
            [firstName, lastName, username, email, hashedPassword]
        );

        return {
            success: true,
            message: 'Registration successful',
            user: result.rows[0]
        };

    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: 'Registration failed. Please try again.' };
    }
}

/**
 * Login a user
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} 
 */
async function loginUser(email, password) {
    try {
        const result = await pool.query(
            'SELECT user_id, first_name, last_name, username, email, password FROM Users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return { success: false, message: 'Invalid email or password' };
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return { success: false, message: 'Invalid email or password' };
        }

        delete user.password;

        return {
            success: true,
            message: 'Login successful',
            user: user
        };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Login failed. Please try again.' };
    }
}

module.exports = {
    registerUser,
    loginUser
};