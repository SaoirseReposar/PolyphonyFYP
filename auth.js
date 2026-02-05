// Authentication Logic
// Handles user registration and login

const bcrypt = require('bcrypt');
const pool = require('./database');

// Number of salt rounds for password hashing (higher = more secure but slower)
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} - Success status and message or error
 */
async function registerUser(userData) {
    const { firstName, lastName, username, email, password } = userData;

    try {
        // Check if email already exists
        const emailCheck = await pool.query(
            'SELECT email FROM Users WHERE email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            return { success: false, message: 'Email already registered' };
        }

        // Check if username already exists
        const usernameCheck = await pool.query(
            'SELECT username FROM Users WHERE username = $1',
            [username]
        );

        if (usernameCheck.rows.length > 0) {
            return { success: false, message: 'Username already taken' };
        }

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert new user into database
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
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} - Success status and user data or error
 */
async function loginUser(email, password) {
    try {
        // Find user by email
        const result = await pool.query(
            'SELECT user_id, first_name, last_name, username, email, password FROM Users WHERE email = $1',
            [email]
        );

        // Check if user exists
        if (result.rows.length === 0) {
            return { success: false, message: 'Invalid email or password' };
        }

        const user = result.rows[0];

        // Compare provided password with hashed password in database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return { success: false, message: 'Invalid email or password' };
        }

        // Remove password from user object before returning
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