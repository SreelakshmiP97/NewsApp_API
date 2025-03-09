const axios = require('axios');
const cheerio = require('cheerio');
const NewsArticle = require('../models/NewsArticle');
const { generateId, retry, browserHeaders } = require('../utils/helpers');
const { classifyTopic } = require('../utils/topicClassifier');

async function scrapeTimesOfIndia() {
    try {
        console.log('Fetching Times of India articles...');
        
        // Try the mobile version of the site which typically has simpler HTML
        const url = 'https://m.timesofindia.com';
        
        console.log(`\nFetching articles from ${url}`);
        
        const response = await retry(async () => {
            return await axios.get(url, {
                headers: {
                    ...browserHeaders,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                },
                timeout: 15000
            });
        });

        const $ = cheerio.load(response.data);
        const articles = [];

        // Debug: Print the entire HTML structure
        console.log('\nPage structure:');
        console.log('Title:', $('title').text());
        console.log('Meta description:', $('meta[name="description"]').attr('content'));
        
        // Try multiple selectors focused on mobile layout
        const selectors = [
            '.top-story',
            '.latest-from-section li',
            '.news-card',
            '.md-news-card',
            '.list-news-card',
            '.news-list li',
            'article',
            '.article-box'
        ];

        console.log('\nTrying selectors:', selectors.join(', '));

        selectors.forEach(selector => {
            const elements = $(selector);
            console.log(`\nFound ${elements.length} elements with selector "${selector}"`);
            
            elements.each((index, element) => {
                const $element = $(element);
                
                // Debug: Print element structure
                if (index === 0) {
                    console.log(`\nFirst element structure for "${selector}":`);
                    console.log('HTML:', $element.html()?.substring(0, 200));
                    console.log('Classes:', $element.attr('class'));
                }

                // Try to find title
                let title = '';
                const titleSelectors = [
                    'h1, h2, h3, h4',
                    '.title',
                    '.headline',
                    'a[data-title]',
                    'a[data-headline]',
                    '.news-title',
                    '.story-title',
                    'figcaption'
                ];

                for (const titleSelector of titleSelectors) {
                    const titleEl = $element.find(titleSelector).first();
                    if (titleEl.length > 0) {
                        title = titleEl.text().trim();
                        if (title) break;
                    }
                }

                // If still no title, try anchor tags with substantial text
                if (!title) {
                    $element.find('a').each((i, link) => {
                        const text = $(link).text().trim();
                        if (text.length > 30) {
                            title = text;
                            return false;
                        }
                    });
                }

                // Try to find URL
                let articleUrl = '';
                const urlSelectors = [
                    'a[href*="/articleshow/"]',
                    'a[href*="/india/"]',
                    'a[href*="/world/"]',
                    'a[href*="/city/"]',
                    'a[href*="/sports/"]',
                    'a[href*="/business/"]',
                    'a[href*="/entertainment/"]'
                ];

                for (const urlSelector of urlSelectors) {
                    const urlEl = $element.find(urlSelector).first();
                    if (urlEl.length > 0) {
                        articleUrl = urlEl.attr('href');
                        if (articleUrl) break;
                    }
                }

                // If no URL found yet, try the closest anchor tag or any anchor containing the title
                if (!articleUrl) {
                    articleUrl = $element.closest('a').attr('href') ||
                                $element.find('a').filter((i, el) => $(el).text().trim() === title).attr('href');
                }

                // Try to find summary
                const summary = $element.find('p, .summary, .brief-copy, .article-content, [data-summary], .synopsis').first().text().trim();
                
                // Try to find image
                const imageUrl = $element.find('img').attr('src') || 
                               $element.find('img').attr('data-src') ||
                               $element.find('[class*="image"]').attr('src');

                // Debug: Print found data
                console.log('\nFound data:', {
                    title: title?.substring(0, 50),
                    url: articleUrl,
                    summary: summary?.substring(0, 50)
                });

                // Skip if title is empty or too short
                if (!title || title.length < 15) return;

                // Clean up URL
                if (articleUrl) {
                    if (!articleUrl.startsWith('http')) {
                        articleUrl = articleUrl.startsWith('/') ? 
                            `https://timesofindia.indiatimes.com${articleUrl}` :
                            `https://timesofindia.indiatimes.com/${articleUrl}`;
                    }

                    // Avoid duplicate articles
                    const isDuplicate = articles.some(a => 
                        a.title === title || 
                        a.url === articleUrl ||
                        (title.length > 30 && a.title.includes(title.substring(0, 30)))
                    );

                    if (!isDuplicate) {
                        // Classify the topic based on title, URL, and summary
                        const topic = classifyTopic(title, articleUrl, summary);

                        articles.push(new NewsArticle({
                            id: generateId(),
                            title,
                            summary: summary || title,
                            content: summary || title,
                            url: articleUrl,
                            source: 'Times of India',
                            topic,
                            publishedAt: new Date().toISOString(),
                            sentimentScore: 0.5,
                            images: imageUrl ? [imageUrl] : [],
                            affectedEntities: []
                        }));

                        console.log('\nProcessed article:', { 
                            title: title?.substring(0, 50) + '...', 
                            url: articleUrl,
                            topic
                        });
                    }
                }
            });
        });

        console.log(`\nFound ${articles.length} articles from Times of India`);
        
        // Print topic distribution
        const topicDistribution = articles.reduce((acc, article) => {
            acc[article.topic] = (acc[article.topic] || 0) + 1;
            return acc;
        }, {});
        
        console.log('\nTopic distribution:', topicDistribution);

        return articles;
    } catch (error) {
        console.error('Error scraping Times of India:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        return [];
    }
}

module.exports = scrapeTimesOfIndia; 