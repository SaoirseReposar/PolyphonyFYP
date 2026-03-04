const express = require('express');
const router = express.Router();
const db = require('../database');

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    next();
}


router.get('/stats', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const [wordsResult, songsResult] = await Promise.all([
            db.query(
                'SELECT COUNT(*) AS count FROM saved_words WHERE user_id = $1',
                [userId]
            ),
            db.query(
                `SELECT COUNT(DISTINCT song_id) AS count 
                 FROM user_song_progress 
                 WHERE user_id = $1 AND completed = true`,
                [userId]
            )
        ]);

        res.json({
            success: true,
            savedWords: parseInt(wordsResult.rows[0].count, 10),
            songsCompleted: parseInt(songsResult.rows[0].count, 10)
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to load stats' });
    }
});


router.get('/recent-songs', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const result = await db.query(
            `SELECT 
                s.id,
                s.title,
                s.artist,
                s.language,
                s.difficulty,
                s.album_art_url,
                usp.last_accessed
             FROM user_song_progress usp
             JOIN songs s ON s.id = usp.song_id
             WHERE usp.user_id = $1
             ORDER BY usp.last_accessed DESC
             LIMIT 5`,
            [userId]
        );

        res.json({
            success: true,
            songs: result.rows
        });
    } catch (error) {
        console.error('Recent songs error:', error);
        res.status(500).json({ success: false, message: 'Failed to load recent songs' });
    }
});


router.get('/saved-words', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const result = await db.query(
            `SELECT 
                sw.id,
                sw.word,
                sw.translation,
                sw.saved_at,
                sw.song_id,
                s.title AS song_title,
                s.language,
                s.difficulty
             FROM saved_words sw
             LEFT JOIN songs s ON s.id = sw.song_id
             WHERE sw.user_id = $1
             ORDER BY sw.saved_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            words: result.rows
        });
    } catch (error) {
        console.error('Saved words error:', error);
        res.status(500).json({ success: false, message: 'Failed to load saved words' });
    }
});


router.delete('/saved-words/:id', requireAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    const wordId = parseInt(req.params.id, 10);

    if (isNaN(wordId)) {
        return res.status(400).json({ success: false, message: 'Invalid word ID' });
    }

    try {
        const result = await db.query(
            'DELETE FROM saved_words WHERE id = $1 AND user_id = $2 RETURNING id',
            [wordId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Word not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete saved word error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove word' });
    }
});

module.exports = router;