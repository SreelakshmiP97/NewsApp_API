const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId, retry, browserHeaders } = require('../utils/helpers');
const { classifyTopic } = require('../utils/topicClassifier');

async function scrapeTheHinduSports() {
    try {
        console.log('Fetching The Hindu sports page...');
        const response = await retry(async () => {
            return await axios.get('https://www.thehindu.com/sport/', {
                headers: {
                    ...browserHeaders,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                },
                timeout: 10000
            });
        });
        
        const $ = cheerio.load(response.data);
        const articles = [];

        console.log('Analyzing The Hindu page structure...');

        // Print first few article containers for debugging
        console.log('\nAnalyzing available elements:');
        $('article, .story-card, .story-card-news, .story-card-sports, [data-test-id="article"]').each((i, el) => {
            if (i < 3) {  // Only show first 3 for debugging
                console.log(`\nElement ${i + 1}:`);
                console.log('Classes:', $(el).attr('class'));
                console.log('HTML:', $(el).html().substring(0, 200) + '...');
            }
        });

        // Try multiple selectors to find articles
        $('article, .story-card, .story-card-news, .story-card-sports, [data-test-id="article"], .element').each((index, element) => {
            let title = '';
            let url = '';
            let summary = '';
            const $element = $(element);
            
            // Try different ways to get title and url
            const titleElement = $element.find('h1, h2, h3, [data-test-id="article-title"], .title, .headline').first();
            title = titleElement.text().trim();
            
            // If title element exists, try to get URL from its parent anchor tag or child anchor tag
            if (titleElement.length > 0) {
                url = titleElement.parent('a').attr('href') || 
                      titleElement.find('a').attr('href') || 
                      $element.find('a').first().attr('href') ||
                      $element.find('link[rel="canonical"]').attr('href');
            }

            // If still no URL, try to find it in any anchor tag containing the title text
            if (!url) {
                $element.find('a').each((i, link) => {
                    if ($(link).text().trim() === title) {
                        url = $(link).attr('href');
                        return false; // break the loop
                    }
                });
            }

            summary = $element.find('p, .summary, .standfirst, [data-test-id="article-description"]').first().text().trim();
            let imageUrl = $element.find('img').attr('src') || 
                          $element.find('img').attr('data-src') ||
                          $element.find('meta[property="og:image"]').attr('content');
            
            console.log('\nProcessing article:', { 
                title: title?.substring(0, 50) + '...', 
                url,
                summary: summary?.substring(0, 50) + '...'
            });

            if (title && url) {
                // Clean up URL if needed
                if (!url.startsWith('http')) {
                    url = `https://www.thehindu.com${url}`;
                }

                // Clean up image URL if needed
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `https://www.thehindu.com${imageUrl}`;
                }

                // Classify the topic based on title, URL, and summary
                const topic = classifyTopic(title, url, summary);

                articles.push(new NewsArticle({
                    id: generateId(),
                    title,
                    summary: summary || title,
                    content: summary || title,
                    url,
                    source: 'The Hindu',
                    topic,
                    publishedAt: new Date().toISOString(),
                    sentimentScore: 0.5,
                    images: imageUrl ? [imageUrl] : [],
                    affectedEntities: []
                }));

                console.log('\nProcessing article:', { 
                    title: title?.substring(0, 50) + '...', 
                    url,
                    topic,
                    summary: summary?.substring(0, 50) + '...'
                });
            }
        });

        console.log(`\nFound ${articles.length} articles from The Hindu Sports`);
        
        // Print topic distribution
        const topicDistribution = articles.reduce((acc, article) => {
            acc[article.topic] = (acc[article.topic] || 0) + 1;
            return acc;
        }, {});
        
        console.log('\nTopic distribution:', topicDistribution);

        if (articles.length === 0) {
            console.log('No articles found. Available classes in document:');
            const classes = new Set();
            $('*[class]').each((i, el) => {
                $(el).attr('class').split(' ').forEach(c => classes.add(c));
            });
            console.log([...classes].sort().join('\n'));
        }
        return articles;
    } catch (error) {
        console.error('Error scraping The Hindu Sports:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        return [];
    }
}

module.exports = scrapeTheHinduSports; 