
const { franc } = require('franc');

const FRANC_TO_POLYPHONY = {
    spa: 'spanish',
    fra: 'french',
    deu: 'german',
    kor: 'korean',
    jpn: 'japanese',
    por: 'portuguese',
    ita: 'italian',
    zho: 'chinese',
    ara: 'arabic',
    rus: 'russian',
    nld: 'dutch',
    swe: 'swedish',
    pol: 'polish',
    tur: 'turkish',
    hin: 'hindi',
};

function mapMoodFromAudioFeatures(features) {
    if (!features) return null;

    const { valence, energy, tempo, danceability } = features;

    if (valence > 0.7 && energy > 0.7) return 'upbeat';
    if (valence > 0.6 && danceability > 0.7) return 'danceable';
    if (valence < 0.3 && energy < 0.4) return 'melancholic';
    if (valence < 0.4 && energy > 0.6) return 'intense';
    if (tempo < 80 && valence > 0.4) return 'calm';
    if (energy > 0.8) return 'energetic';
    return 'neutral';
}

/**
 * Detect the language of a song from its lyrics.
 * Falls back to Spotify market data if franc is uncertain.
 *
 * @param {string} lyricsText 
 * @param {string[]} availableMarkets 
 * @returns {string|null} 
 */
function detectLanguage(lyricsText, availableMarkets = []) {
    if (!lyricsText || lyricsText.trim().length < 30) return null;

    const langCode = franc(lyricsText, { minLength: 10 });

    if (langCode === 'und') return null; 

    const mapped = FRANC_TO_POLYPHONY[langCode];
    if (mapped) return mapped;

    return langCode;
}

/**
 * Score the difficulty of lyrics on a 0–100 scale, then bucket into
 * beginner / intermediate / advanced.
 *
 * Factors:
 *  - Average word length (longer = harder)
 *  - Unique word ratio (more variety = harder)
 *  - Average words per line (longer lines = harder)
 *  - Punctuation complexity (commas, semicolons, em-dashes = harder)
 *
 * @param {Array<{text: string}>} lyrics - Parsed lyric lines
 * @returns {{ difficulty: string, score: number, breakdown: object }}
 */
function scoreDifficulty(lyrics) {
    if (!lyrics || lyrics.length === 0) {
        return { difficulty: 'intermediate', score: 50, breakdown: {} };
    }

    const lines = lyrics.map(l => l.text).filter(Boolean);
    const allText = lines.join(' ');
    const allWords = allText
        .replace(/[^\p{L}\s]/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

    if (allWords.length === 0) {
        return { difficulty: 'beginner', score: 20, breakdown: {} };
    }

    // 1. Average word length (scale: 3-8 chars → 0-40 points)
    const avgWordLength = allWords.reduce((sum, w) => sum + w.length, 0) / allWords.length;
    const wordLengthScore = Math.min(40, Math.max(0, (avgWordLength - 3) / 5 * 40));

    // 2. Unique word ratio (scale: 0.3-0.9 → 0-30 points)
    const uniqueWords = new Set(allWords.map(w => w.toLowerCase()));
    const uniqueRatio = uniqueWords.size / allWords.length;
    const uniqueScore = Math.min(30, Math.max(0, (uniqueRatio - 0.3) / 0.6 * 30));

    // 3. Average words per line (scale: 3-12 words → 0-20 points)
    const avgWordsPerLine = allWords.length / lines.length;
    const lineLengthScore = Math.min(20, Math.max(0, (avgWordsPerLine - 3) / 9 * 20));

    // 4. Punctuation complexity (commas, semicolons, dashes → 0-10 points)
    const punctuationMatches = allText.match(/[,;:—–\(\)]/g) || [];
    const punctuationDensity = punctuationMatches.length / lines.length;
    const punctuationScore = Math.min(10, punctuationDensity * 3);

    const totalScore = wordLengthScore + uniqueScore + lineLengthScore + punctuationScore;

    let difficulty;
    if (totalScore < 33) difficulty = 'beginner';
    else if (totalScore < 66) difficulty = 'intermediate';
    else difficulty = 'advanced';

    return {
        difficulty,
        score: Math.round(totalScore),
        breakdown: {
            avgWordLength: Math.round(avgWordLength * 10) / 10,
            uniqueRatio: Math.round(uniqueRatio * 100) + '%',
            avgWordsPerLine: Math.round(avgWordsPerLine * 10) / 10,
            punctuationDensity: Math.round(punctuationDensity * 10) / 10,
            scores: {
                wordLength: Math.round(wordLengthScore),
                uniqueness: Math.round(uniqueScore),
                lineLength: Math.round(lineLengthScore),
                punctuation: Math.round(punctuationScore),
            }
        }
    };
}

/**
 * Full classification pipeline for a track.
 *
 * @param {object} params
 * @param {string} params.plainLyrics 
 * @param {Array}  params.parsedLyrics 
 * @param {object} params.audioFeatures 
 * @param {string[]} params.availableMarkets 
 * @returns {{ language: string|null, difficulty: string, difficultyScore: number, mood: string|null, breakdown: object }}
 */
function classifySong({ plainLyrics, parsedLyrics, audioFeatures = null, availableMarkets = [] }) {
    const language = detectLanguage(plainLyrics, availableMarkets);
    const { difficulty, score, breakdown } = scoreDifficulty(parsedLyrics);
    const mood = mapMoodFromAudioFeatures(audioFeatures);

    return {
        language,
        difficulty,
        difficultyScore: score,
        mood,
        breakdown
    };
}

module.exports = {
    classifySong,
    detectLanguage,
    scoreDifficulty,
    mapMoodFromAudioFeatures
};