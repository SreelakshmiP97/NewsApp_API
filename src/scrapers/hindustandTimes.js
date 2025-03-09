const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId } = require('../utils/helpers');

async function scrapeHindustanTimes() {
    try {
        const response = await axios.get('https://www.hindustantimes.com/');
        const $ = cheerio.load(response.data);
        const articles = [];

        // Scraping top stories
        $('.hdg3').each((index, element) => {
            const title = $(element).text().trim();
            const url = $(element).find('a').attr('href');
            const summary = $(element).closest('.article').find('.sortDec').text().trim();
            const imageUrl = $(element).closest('.article').find('img').attr('src');

            if (title && url) {
                articles.push(new NewsArticle({
                    id: generateId(),
                    title,
                    summary: summary || title,
                    content: summary || title,
                    url: url.startsWith('http') ? url : `https://www.hindustantimes.com${url}`,
                    source: 'Hindustan Times',
                    topic: 'General',
                    publishedAt: new Date().toISOString(),
                    sentimentScore: 0.5,
                    images: imageUrl ? [imageUrl] : [],
                    affectedEntities: []
                }));
            }
        });

        return articles;
    } catch (error) {
        console.error('Error scraping Hindustan Times:', error);
        return [];
    }
}

module.exports = scrapeHindustanTimes; 