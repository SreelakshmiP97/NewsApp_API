const topicKeywords = {
    politics: [
        'minister', 'government', 'parliament', 'election', 'modi', 'congress',
        'bjp', 'political', 'vote', 'democracy', 'cabinet', 'opposition',
        'assembly', 'party', 'manifesto', 'campaign'
    ],
    business: [
        'market', 'economy', 'stock', 'company', 'business', 'trade',
        'investment', 'profit', 'revenue', 'startup', 'industry', 'corporate',
        'shares', 'investor', 'rupee', 'banking'
    ],
    technology: [
        'tech', 'technology', 'digital', 'software', 'ai', 'artificial intelligence',
        'app', 'smartphone', 'cyber', 'internet', 'online', 'innovation',
        'computing', 'robot', '5g', 'blockchain'
    ],
    sports: [
        'cricket', 'football', 'sport', 'match', 'tournament', 'championship',
        'player', 'team', 'game', 'olympic', 'athlete', 'racing',
        'score', 'win', 'trophy', 'ipl', 'world cup'
    ],
    entertainment: [
        'movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood',
        'cinema', 'music', 'song', 'celebrity', 'entertainment', 'star',
        'director', 'show', 'drama', 'concert'
    ],
    agriculture: [
        'farm', 'agriculture', 'crop', 'farmer', 'harvest', 'cultivation',
        'agricultural', 'irrigation', 'monsoon', 'rural', 'soil', 'seed',
        'produce', 'mandi', 'kisan', 'food grain'
    ],
    health: [
        'health', 'medical', 'hospital', 'doctor', 'disease', 'treatment',
        'patient', 'medicine', 'healthcare', 'virus', 'vaccine', 'surgery',
        'clinic', 'wellness', 'covid', 'pandemic'
    ],
    education: [
        'education', 'school', 'college', 'university', 'student', 'exam',
        'academic', 'course', 'teacher', 'learning', 'study', 'degree',
        'campus', 'admission', 'board', 'ugc'
    ],
    environment: [
        'environment', 'climate', 'pollution', 'green', 'sustainable', 'renewable',
        'energy', 'carbon', 'wildlife', 'forest', 'conservation', 'ecology',
        'biodiversity', 'waste', 'solar', 'clean'
    ],
    crime: [
        'crime', 'police', 'arrest', 'murder', 'investigation', 'court',
        'criminal', 'law', 'security', 'theft', 'scam', 'fraud',
        'prison', 'case', 'charge', 'probe'
    ]
};

// URL patterns for topic classification
const urlPatterns = {
    politics: ['/politics/', '/india/', '/elections/'],
    business: ['/business/', '/markets/', '/economy/'],
    technology: ['/tech/', '/technology/', '/gadgets/'],
    sports: ['/sport/', '/cricket/', '/football/'],
    entertainment: ['/entertainment/', '/movies/', '/music/'],
    agriculture: ['/agriculture/', '/rural/', '/agri-business/'],
    health: ['/health/', '/wellness/', '/fitness/'],
    education: ['/education/', '/students/', '/academics/'],
    environment: ['/environment/', '/climate/', '/earth/'],
    crime: ['/crime/', '/legal/', '/court/']
};

function classifyTopic(title = '', url = '', content = '') {
    // Convert all text to lowercase for matching
    const text = `${title} ${content}`.toLowerCase();
    const urlLower = url.toLowerCase();

    // First try to classify based on URL patterns
    for (const [topic, patterns] of Object.entries(urlPatterns)) {
        if (patterns.some(pattern => urlLower.includes(pattern))) {
            return topic;
        }
    }

    // Then try to classify based on keywords
    const topicScores = {};
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        topicScores[topic] = keywords.reduce((score, keyword) => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = (text.match(regex) || []).length;
            return score + matches;
        }, 0);
    }

    // Get topic with highest score
    const maxScore = Math.max(...Object.values(topicScores));
    if (maxScore > 0) {
        return Object.entries(topicScores).find(([_, score]) => score === maxScore)[0];
    }

    // Default topic if no matches found
    return 'general';
}

module.exports = {
    classifyTopic,
    topicKeywords,
    urlPatterns
}; 