const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId, retry, browserHeaders } = require('../utils/helpers');
const { classifyTopic } = require('../utils/topicClassifier');

async function scrapeTheHinduSports() {
    try {
        console.log('Fetching The Hindu sports articles from RSS feeds...');
        
        // Use RSS feeds instead of web scraping
        const rssFeeds = [
            'https://www.thehindu.com/sport/feeder/default.rss',
            'https://www.thehindu.com/sport/cricket/feeder/default.rss',
            'https://www.thehindu.com/sport/football/feeder/default.rss',
            'https://www.thehindu.com/sport/other-sports/feeder/default.rss'
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
                    
                    // Extract image from description HTML or media:content
                    let imageUrl = null;
                    const $description = cheerio.load(description);
                    const mediaContent = $item.find('media\\:content, content').attr('url');
                    
                    if (mediaContent) {
                        imageUrl = mediaContent;
                    } else {
                        const $img = $description('img').first();
                        if ($img.length) {
                            imageUrl = $img.attr('src');
                        }
                    }
                    
                    // Skip if we already have this article
                    if (articles.some(a => a.url === link)) {
                        return;
                    }
                    
                    if (title && link && title.length > 15) {
                        const topic = classifyTopic(title, link, description);
                        
                        // Clean description HTML
                        const cleanDescription = $description.text().trim() || description;
                        
                        articles.push(new NewsArticle({
                            id: generateId(),
                            title,
                            summary: cleanDescription || title,
                            content: cleanDescription || title,
                            url: link,
                            source: 'The Hindu',
                            topic,
                            publishedAt: new Date(pubDate).toISOString(),
                            sentimentScore: 0.5,
                            images: imageUrl ? [imageUrl] : [],
                            affectedEntities: []
                        }));
                        
                        console.log('Found article:', {
                            title: title.substring(0, 50) + '...',
                            url: link,
                            date: pubDate,
                            hasImage: !!imageUrl
                        });
                    }
                });
                
                console.log(`Found ${$('item').length} articles from feed`);
                
            } catch (error) {
                console.error(`Error fetching RSS feed ${feedUrl}:`, error.message);
                if (error.response) {
                    console.error('Response status:', error.response.status);
                    console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
                }
                continue; // Continue with next feed even if one fails
            }
        }

        console.log(`\nTotal articles found from The Hindu Sports: ${articles.length}`);
        return articles;
    } catch (error) {
        console.error('Error in The Hindu Sports scraper:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        }
        return [];
    }
}

module.exports = scrapeTheHinduSports; 