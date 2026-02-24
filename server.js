// server.js - Main API Server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./database');
const songRoutes = require('./routes/songRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Polyphony API is running' });
});

// API Routes
app.use('/api', songRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`API server running`);
    
    // Test database connection
    db.query('SELECT NOW()')
        .then(() => console.log('✓ Database connection verified'))
        .catch(err => console.error('✗ Database connection failed:', err.message));
});

module.exports = app;