// services/translationService.js - DeepL Translation Service
const deepl = require('deepl-node');
require('dotenv').config();

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

// Language code mapping (Spotify/Your format → DeepL format)
const languageMap = {
    'spanish': 'ES',
    'french': 'FR',
    'german': 'DE',
    'korean': 'KO',
    'english': 'EN-US'
};

/**
 * Translate a single text
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code (default: EN-US)
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, sourceLang, targetLang = 'EN-US') {
    try {
        const sourceCode = languageMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase();
        const result = await translator.translateText(text, sourceCode, targetLang);
        return result.text;
    } catch (error) {
        console.error('DeepL Translation Error:', error);
        throw new Error('Translation failed');
    }
}

/**
 * Translate multiple texts in batch (more efficient)
 * @param {Array<string>} texts - Array of texts to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Promise<Array<string>>} - Array of translated texts
 */
async function translateBatch(texts, sourceLang, targetLang = 'EN-US') {
    try {
        const sourceCode = languageMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase();
        const results = await translator.translateText(texts, sourceCode, targetLang);
        return results.map(r => r.text);
    } catch (error) {
        console.error('DeepL Batch Translation Error:', error);
        throw new Error('Batch translation failed');
    }
}

/**
 * Translate a single word with context
 * @param {string} word - Word to translate
 * @param {string} sourceLang - Source language
 * @param {string} sentence - Context sentence (optional)
 * @returns {Promise<Object>} - Translation with context
 */
async function translateWord(word, sourceLang, sentence = null, targetLang = 'EN-US') {
    try {
        const sourceCode = languageMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase();
        
        // Translate the word
        const wordTranslation = await translator.translateText(word, sourceCode, targetLang);
        
        // If sentence provided, translate it for context
        let context = null;
        if (sentence) {
            const sentenceTranslation = await translator.translateText(sentence, sourceCode, targetLang);
            context = sentenceTranslation.text;
        }
        
        return {
            word: word,
            translation: wordTranslation.text,
            context: context
        };
    } catch (error) {
        console.error('Word Translation Error:', error);
        throw new Error('Word translation failed');
    }
}

/**
 * Get usage information from DeepL API
 * @returns {Promise<Object>} - Usage statistics
 */
async function getUsage() {
    try {
        const usage = await translator.getUsage();
        return {
            character_count: usage.character.count,
            character_limit: usage.character.limit,
            percentage_used: ((usage.character.count / usage.character.limit) * 100).toFixed(2)
        };
    } catch (error) {
        console.error('Error fetching usage:', error);
        return null;
    }
}

module.exports = {
    translateText,
    translateBatch,
    translateWord,
    getUsage
};