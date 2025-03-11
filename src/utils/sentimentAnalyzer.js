const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

function getSentimentLabel(score) {
    if (score < 0.3) return 'Very Negative';
    if (score < 0.45) return 'Negative';
    if (score < 0.55) return 'Neutral';
    if (score < 0.7) return 'Positive';
    return 'Very Positive';
}

function analyzeSentiment(text) {
    try {
        if (!text) return 0.5;

        // Tokenize the text
        const tokens = tokenizer.tokenize(text);
        if (!tokens || tokens.length === 0) return 0.5;

        // Get the sentiment score
        const score = analyzer.getSentiment(tokens);

        // Normalize the score to [0, 1] range with better distribution
        // This will give more balanced results between positive and negative
        const normalizedScore = (score + 5) / 10;

        // Ensure the score is between 0 and 1
        const finalScore = Math.max(0, Math.min(1, normalizedScore));
        
        return {
            score: finalScore,
            label: getSentimentLabel(finalScore)
        };
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return {
            score: 0.5,
            label: 'Neutral'
        }; // Return neutral sentiment on error
    }
}

module.exports = analyzeSentiment; 