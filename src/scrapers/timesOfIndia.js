const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId, retry, browserHeaders } = require('../utils/helpers');
const { classifyTopic } = require('../utils/topicClassifier');

async function scrapeTimesOfIndia() {
    try {
        console.log('Fetching Times of India articles from RSS feeds...');
        
        // Use TOI's RSS feeds which are more reliable
        const rssFeeds = [
            'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
            'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',  // India
            'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',    // World
            'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',      // Business
            'https://timesofindia.indiatimes.com/rssfeeds/4719161.cms'       // Tech
        ];
        
        const articles = [];
        
        for (const feedUrl of rssFeeds) {
            try {
                console.log(`\nFetching from RSS feed: ${feedUrl}`);
                
                const response = await retry(async () => {
                    return await axios.get(feedUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            'Accept': 'application/rss+xml,application/xml;q=0.9',
                            'Accept-Language': 'en-US,en;q=0.9'
                        },
                        timeout: 10000
                    });
                }, 3, 2000);

                const $ = cheerio.load(response.data, {
                    xmlMode: true
                });

                // Process each item in the RSS feed
                $('item').each((_, element) => {
                    const $item = $(element);
                    
                    const title = $item.find('title').text().trim();
                    const description = $item.find('description').text().trim();
                    const link = $item.find('link').text().trim();
                    const pubDate = $item.find('pubDate').text().trim();
                    const imageUrl = $item.find('enclosure').attr('url') || 
                                   $(description).find('img').attr('src');
                    
                    // Skip if we already have this article
                    if (articles.some(a => a.url === link)) {
                        return;
                    }
                    
                    if (title && title.length > 15) {
                        const topic = classifyTopic(title, link, description);
                        
                        articles.push(new NewsArticle({
                            id: generateId(),
                            title,
                            summary: description || title,
                            content: description || title,
                            url: link,
                            source: 'Times of India',
                            topic,
                            publishedAt: new Date(pubDate).toISOString(),
                            sentimentScore: 0.5,
                            images: imageUrl ? [imageUrl] : [],
                            affectedEntities: []
                        }));
                        
                        console.log('Found article:', {
                            title: title.substring(0, 50) + '...',
                            url: link,
                            date: pubDate
                        });
                    }
                });
                
                console.log(`Found ${$('item').length} articles from feed`);
                
            } catch (error) {
                console.error(`Error fetching RSS feed ${feedUrl}:`, error.message);
                continue; // Continue with next feed even if one fails
            }
        }

        console.log(`\nTotal articles found from Times of India: ${articles.length}`);
        return articles;
    } catch (error) {
        console.error('Error in Times of India scraper:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        }
        throw error;
    }
}

module.exports = scrapeTimesOfIndia; 