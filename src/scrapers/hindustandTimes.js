const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId, retry, browserHeaders } = require('../utils/helpers');
const { classifyTopic } = require('../utils/topicClassifier');
const analyzeSentiment = require('../utils/sentimentAnalyzer');

async function scrapeHindustanTimes() {
    try {
        console.log('Fetching Hindustan Times articles...');
        
        const response = await retry(async () => {
            return await axios.get('https://www.hindustantimes.com/', {
                headers: {
                    ...browserHeaders,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Referer': 'https://www.hindustantimes.com',
                    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                },
                timeout: 10000
            });
        });

        const $ = cheerio.load(response.data);
        const articles = [];

        // Debug: Print page title
        console.log('Page title:', $('title').text());

        // Array of selectors to try
        const articleSelectors = [
            '.hdg3',                    // Top stories
            '.top-news-card',           // Top news cards
            '.latest-news-card',        // Latest news
            '.news-card',               // General news cards
            '.big-story',               // Big stories
            '.featured-news'            // Featured news
        ];

        articleSelectors.forEach(selector => {
            $(selector).each((index, element) => {
                const $article = $(element);
                
                // Find title and URL
                const $titleElement = $article.is('a') ? $article : $article.find('a').first();
                const title = $titleElement.text().trim();
                let url = $titleElement.attr('href');
                
                // Find summary
                const summary = $article.closest('.article, .card, .story').find('.sortDec, .description, p').first().text().trim();
                
                // Find image - try multiple approaches
                let imageUrl = null;
                
                // 1. Try direct img tag
                const $img = $article.closest('.article, .card, .story').find('img');
                if ($img.length) {
                    imageUrl = $img.attr('src') || $img.attr('data-src');
                }
                
                // 2. Try figure tag
                if (!imageUrl) {
                    const $figure = $article.closest('.article, .card, .story').find('figure');
                    if ($figure.length) {
                        imageUrl = $figure.find('img').attr('src') || 
                                 $figure.find('img').attr('data-src') ||
                                 $figure.attr('data-src');
                    }
                }
                
                // 3. Try meta tags
                if (!imageUrl) {
                    imageUrl = $('meta[property="og:image"]').attr('content');
                }

                // Clean up URL
                if (url && !url.startsWith('http')) {
                    url = `https://www.hindustantimes.com${url}`;
                }

                // Clean up image URL
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `https://www.hindustantimes.com${imageUrl}`;
                }

                if (title && url && title.length > 15) {
                    // Classify topic
                    const topic = classifyTopic(title, url, summary);

                    // Calculate sentiment score from title and summary
                    const sentiment = analyzeSentiment(title + ' ' + summary);

                    const article = new NewsArticle({
                        id: generateId(),
                        title,
                        summary: summary || title,
                        content: summary || title,
                        url,
                        source: 'Hindustan Times',
                        topic,
                        publishedAt: new Date().toISOString(),
                        sentimentScore: sentiment.score,
                        sentimentLabel: sentiment.label,
                        images: imageUrl ? [imageUrl] : [],
                        affectedEntities: []
                    });

                    // Avoid duplicates
                    if (!articles.some(a => a.url === url)) {
                        articles.push(article);
                        console.log('Found article:', {
                            title: title.substring(0, 50) + '...',
                            url,
                            sentiment: `${sentiment.label} (${sentiment.score.toFixed(2)})`,
                            hasImage: !!imageUrl
                        });
                    }
                }
            });
        });

        console.log(`\nTotal articles found from Hindustan Times: ${articles.length}`);
        return articles;
    } catch (error) {
        console.error('Error scraping Hindustan Times:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        }
        return [];
    }
}

module.exports = scrapeHindustanTimes;