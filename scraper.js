// scraper.js
const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');

// Enhanced scraping function with Playwright
async function scrapeWithPlaywright(url) {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Create a browser context with userAgent
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        await page.goto(url, {
            waitUntil: 'load',
            timeout: 45000
        });

        await page.waitForTimeout(3000);

        const result = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                buttons: [],
                stockElements: [],
                priceElements: []
            };
        });

        return result;

    } finally {
        await browser.close();
    }
}


// Fallback axios scraper for simple sites
async function scrapeWithAxios(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        const buttons = [];
        const stockElements = [];
        const priceElements = [];
        
        // Extract buttons
        $('button, input[type="submit"], .btn, .button').each((i, el) => {
            const text = $(el).text().trim();
            if (text) buttons.push(text);
        });
        
        // Extract stock info
        $('.stock, .availability, .sold-out, .out-of-stock, .unavailable, .in-stock').each((i, el) => {
            const text = $(el).text().trim();
            if (text) stockElements.push(text);
        });
        
        // Extract prices
        $('.price, .cost, .money, [class*="price"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.match(/[\$£€¥]\d+|\d+\.\d{2}/)) {
                priceElements.push(text);
            }
        });
        
        return {
            buttons: [...new Set(buttons)],
            stockElements: [...new Set(stockElements)],
            priceElements: [...new Set(priceElements)],
            title: $('title').text().trim(),
            url: url
        };
        
    } catch (error) {
        throw new Error(`Axios scraping failed: ${error.message}`);
    }
}

// Main scraping function that tries both methods
async function scrapeWebsite(url) {
    let result;
    let method = 'Unknown';
    
    try {
        console.log('🎭 Trying Playwright...');
        result = await retry(() => scrapeWithPlaywright(url), 3, 5000);
        method = 'Playwright (JavaScript rendered)';
        
        if (!result.buttons.length && !result.stockElements.length && !result.priceElements.length) {
            console.log('📡 Playwright found nothing, trying Axios...');
            const axiosResult = await retry(() => scrapeWithAxios(url), 3, 5000);
            if (axiosResult.buttons.length || axiosResult.stockElements.length || axiosResult.priceElements.length) {
                result = axiosResult;
                method = 'Axios (Static HTML)';
            }
        }
    } catch (e) {
        console.error(`❌ All scraping methods failed for ${url}: ${e.message}`);
        return {
            buttons: [],
            stockElements: [],
            priceElements: [],
            title: '',
            url,
            method: 'None',
            error: e.message
        };
    }
    
    return { ...result, method };
}



// Function to check if product is in stock
function isInStock(result) {
    const { buttons, stockElements } = result;
    const allText = [...buttons, ...stockElements].join(' ').toLowerCase();
    
    // Check for out of stock indicators
    const outOfStockTerms = ['sold out', 'out of stock', 'unavailable', 'notify when available', 'back order', 'pre-order'];
    const hasOutOfStock = outOfStockTerms.some(term => allText.includes(term));
    
    // Check for in stock indicators
    const inStockTerms = ['add to cart', 'add to bag', 'buy now', 'in stock', 'available', 'purchase'];
    const hasInStock = inStockTerms.some(term => allText.includes(term));
    
    if (hasOutOfStock) return false;
    if (hasInStock) return true;
    return null; // Unknown
}

// Extract price from result
function extractPrice(result) {
    if (!result.priceElements.length) return null;
    
    // Find the most likely price (usually the first one with currency symbol and decimal)
    for (const price of result.priceElements) {
        const match = price.match(/[\$£€¥]\d+(?:\.\d{2})?/);
        if (match) return match[0];
    }
    
    return result.priceElements[0]; // Return first price if no perfect match
}

// Simple retry helper
// Simple retry helper function
async function retry(fn, retries = 3, delay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ Retry attempt ${attempt} failed: ${err.message}`);
            if (attempt < retries) {
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw lastError;
}


module.exports = {
    scrapeWebsite,
    scrapeWithPlaywright,
    scrapeWithAxios,
    isInStock,
    extractPrice
};