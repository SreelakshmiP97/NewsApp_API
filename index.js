const express = require('express');
const cors = require('cors');
const scrapeTimesOfIndia = require('./src/scrapers/timesOfIndia');
const scrapeTheHinduSports = require('./src/scrapers/theHindu');
const scrapeHindustanTimes = require('./src/scrapers/hindustandTimes');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({
    origin: '*', // Configure this according to your frontend URL in production
    methods: ['GET']
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        error: err.message,
        path: req.path,
        method: req.method
    });
});

// Timeout middleware
const timeout = 25000; // 25 seconds (Vercel has 30s limit for hobby tier)
const timeoutMiddleware = (req, res, next) => {
    res.setTimeout(timeout, () => {
        const err = new Error('Request Timeout');
        err.status = 408;
        next(err);
    });
    next();
};

app.use(timeoutMiddleware);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Individual scraping endpoints
app.get('/api/news/timesofindia', async (req, res, next) => {
    try {
        console.log('Fetching Times of India news...');
        const articles = await scrapeTimesOfIndia();
        console.log(`Found ${articles.length} articles from Times of India`);
        res.json(articles);
    } catch (error) {
        next(error);
    }
});

app.get('/api/news/thehindu/sports', async (req, res, next) => {
    try {
        console.log('Fetching The Hindu sports news...');
        const articles = await scrapeTheHinduSports();
        console.log(`Found ${articles.length} articles from The Hindu sports`);
        res.json(articles);
    } catch (error) {
        next(error);
    }
});

app.get('/api/news/hindustantimes', async (req, res, next) => {
    try {
        console.log('Fetching Hindustan Times news...');
        const articles = await scrapeHindustanTimes();
        console.log(`Found ${articles.length} articles from Hindustan Times`);
        res.json(articles);
    } catch (error) {
        next(error);
    }
});

// Combined news endpoint
app.get('/api/news/all', async (req, res, next) => {
    try {
        console.log('Fetching news from all sources...');
        const [timesOfIndiaNews, hinduSportsNews, hindustanTimesNews] = await Promise.all([
            scrapeTimesOfIndia(),
            scrapeTheHinduSports(),
            scrapeHindustanTimes()
        ]);

        const allNews = [
            ...timesOfIndiaNews,
            ...hinduSportsNews,
            ...hindustanTimesNews
        ];

        console.log(`Total articles found: ${allNews.length}`);
        console.log(`- Times of India: ${timesOfIndiaNews.length}`);
        console.log(`- The Hindu Sports: ${hinduSportsNews.length}`);
        console.log(`- Hindustan Times: ${hindustanTimesNews.length}`);

        res.json(allNews);
    } catch (error) {
        next(error);
    }
});

// Only start the server if we're not in a Vercel environment
if (process.env.VERCEL !== '1') {
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
        console.log(`All news: http://localhost:${PORT}/api/news/all`);
    });
}

// Export the Express API
module.exports = app; 