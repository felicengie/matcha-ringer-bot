// scraper.js
// Enhanced scraper.js with optimizations
const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');

// Browser instance management (reuse browsers instead of launching new ones)
class BrowserManager {
    constructor() {
        this.browser = null;
        this.isLaunching = false;
        this.contexts = new Map();
    }

    async getBrowser() {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }

        if (this.isLaunching) {
            // Wait for existing launch to complete
            while (this.isLaunching) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.browser;
        }

        this.isLaunching = true;
        try {
            console.log('🚀 Launching new browser instance...');
            this.browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            });
            console.log('✅ Browser launched successfully');
        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw error;
        } finally {
            this.isLaunching = false;
        }

        return this.browser;
    }

    async getContext(vendor) {
        const browser = await this.getBrowser();
        
        if (!this.contexts.has(vendor)) {
            console.log(`🔧 Creating new context for ${vendor}`);
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'America/New_York',
                // Disable images and CSS to speed up loading
                extraHTTPHeaders: {
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            
            // Block unnecessary resources
            await context.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });
            
            this.contexts.set(vendor, context);
        }
        
        return this.contexts.get(vendor);
    }

    async cleanup() {
        console.log('🧹 Cleaning up browser resources...');
        for (const [vendor, context] of this.contexts.entries()) {
            try {
                await context.close();
                console.log(`✅ Closed context for ${vendor}`);
            } catch (error) {
                console.error(`❌ Error closing context for ${vendor}:`, error.message);
            }
        }
        this.contexts.clear();

        if (this.browser) {
            try {
                await this.browser.close();
                console.log('✅ Browser closed successfully');
            } catch (error) {
                console.error('❌ Error closing browser:', error.message);
            }
            this.browser = null;
        }
    }
}

// Global browser manager
const browserManager = new BrowserManager();

// Enhanced scraping function with better error handling and performance
async function scrapeWithPlaywright(url, vendor = 'unknown', maxRetries = 2) {
    let page = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🎭 Playwright attempt ${attempt}/${maxRetries} for ${url}`);
            
            const context = await browserManager.getContext(vendor);
            page = await context.newPage();
            
            // Set shorter timeouts for individual operations
            page.setDefaultTimeout(20000); // 20 seconds instead of 30
            page.setDefaultNavigationTimeout(25000); // 25 seconds for navigation
            
            // Navigate with retry logic
            try {
                await page.goto(url, { 
                    waitUntil: 'domcontentloaded', // Don't wait for all resources
                    timeout: 25000 
                });
            } catch (navError) {
                if (navError.message.includes('timeout')) {
                    console.log(`⏳ Navigation timeout, but checking if page loaded...`);
                    // Continue anyway, sometimes the page loads enough content
                } else {
                    throw navError;
                }
            }
            
            // Reduced wait time for dynamic content
            await page.waitForTimeout(1500); // 1.5 seconds instead of 3
            
            // Extract data with timeout protection
            const result = await Promise.race([
                page.evaluate(extractDataFunction),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Data extraction timeout')), 10000)
                )
            ]);
            
            await page.close();
            return result;
            
        } catch (error) {
            console.log(`❌ Playwright attempt ${attempt} failed: ${error.message}`);
            
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    console.log('Error closing page:', closeError.message);
                }
            }
            
            // If it's the last attempt, throw the error
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retry with exponential backoff
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Optimized data extraction function
const extractDataFunction = () => {
    // Helper function to clean text
    const cleanText = (text) => {
        return text ? text.trim().replace(/\s+/g, ' ') : '';
    };
    
    // More focused selectors (common ones first)
    const buttonSelectors = [
        'button:contains("Add to Cart")', 
        'button:contains("Buy Now")', 
        'button:contains("Sold Out")',
        '.add-to-cart', 
        '.sold-out-btn',
        'button[type="submit"]',
        '.btn',
        '.button'
    ];
    
    const stockSelectors = [
        '.sold-out', 
        '.out-of-stock', 
        '.in-stock', 
        '.stock-status',
        '.availability'
    ];
    
    const priceSelectors = [
        '.price', 
        '.money', 
        '.cost',
        '[data-price]'
    ];
    
    const buttons = [];
    const stockElements = [];
    const priceElements = [];
    
    // Process selectors more efficiently
    try {
        // Quick button check
        buttonSelectors.slice(0, 5).forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    const text = cleanText(el.textContent || el.value);
                    if (text && text.length < 50) buttons.push(text);
                });
            } catch (e) {} // Silent fail for individual selectors
        });
        
        // Quick stock check
        stockSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    const text = cleanText(el.textContent);
                    if (text && text.length < 50) stockElements.push(text);
                });
            } catch (e) {}
        });
        
        // Quick price check
        priceSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    const text = cleanText(el.textContent);
                    if (text && text.match(/[\$£€¥]\d+|\d+\.\d{2}/)) {
                        priceElements.push(text);
                    }
                });
            } catch (e) {}
        });
        
    } catch (error) {
        console.log('Error in data extraction:', error.message);
    }
    
    return {
        buttons: [...new Set(buttons)].slice(0, 10), // Limit results
        stockElements: [...new Set(stockElements)].slice(0, 10),
        priceElements: [...new Set(priceElements)].slice(0, 5),
        title: document.title?.trim() || '',
        url: window.location.href
    };
};

// Enhanced main scraping function with circuit breaker
async function scrapeWebsite(url, vendor = 'unknown') {
    // Quick axios check first for simple sites
    let shouldTryPlaywright = true;
    
    try {
        console.log('📡 Quick axios check...');
        const axiosResult = await scrapeWithAxios(url, 8000); // 8 second timeout
        
        // If axios finds good data, use it (much faster)
        if (axiosResult.buttons.length > 0 || axiosResult.stockElements.length > 2) {
            console.log('✅ Axios found sufficient data, skipping Playwright');
            return { ...axiosResult, method: 'Axios (sufficient data)' };
        }
        
    } catch (axiosError) {
        console.log('📡 Axios failed:', axiosError.message);
    }
    
    // Use Playwright for complex sites
    try {
        const result = await scrapeWithPlaywright(url, vendor);
        return { ...result, method: 'Playwright (JavaScript rendered)' };
    } catch (playwrightError) {
        console.error('🎭 Playwright failed:', playwrightError.message);
        
        // Final axios fallback
        try {
            const fallbackResult = await scrapeWithAxios(url, 15000);
            return { ...fallbackResult, method: 'Axios (Playwright fallback)' };
        } catch (finalError) {
            throw new Error(`All scraping methods failed. Last error: ${finalError.message}`);
        }
    }
}

// Optimized axios scraper
async function scrapeWithAxios(url, timeout = 10000) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        },
        timeout: timeout,
        maxRedirects: 3
    });
    
    const $ = cheerio.load(response.data);
    
    const buttons = [];
    const stockElements = [];
    const priceElements = [];
    
    // More targeted extraction
    $('button, .btn, input[type="submit"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 50) buttons.push(text);
    });
    
    $('.sold-out, .out-of-stock, .in-stock, .stock').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 50) stockElements.push(text);
    });
    
    $('.price, .money, .cost').each((i, el) => {
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
}

// Function to check if product is in stock (unchanged)
function isInStock(result) {
    const { buttons, stockElements } = result;
    const allText = [...buttons, ...stockElements].join(' ').toLowerCase();
    
    const outOfStockTerms = ['sold out', 'out of stock', 'unavailable', 'notify when available'];
    const hasOutOfStock = outOfStockTerms.some(term => allText.includes(term));
    
    const inStockTerms = ['add to cart', 'add to bag', 'buy now', 'in stock', 'available'];
    const hasInStock = inStockTerms.some(term => allText.includes(term));
    
    if (hasOutOfStock) return false;
    if (hasInStock) return true;
    return null;
}

// Extract price from result (unchanged)
function extractPrice(result) {
    if (!result.priceElements.length) return null;
    
    for (const price of result.priceElements) {
        const match = price.match(/[\$£€¥]\d+(?:\.\d{2})?/);
        if (match) return match[0];
    }
    
    return result.priceElements[0];
}

// Cleanup function to call when shutting down
function cleanup() {
    return browserManager.cleanup();
}

module.exports = {
    scrapeWebsite,
    scrapeWithPlaywright,
    scrapeWithAxios,
    isInStock,
    extractPrice,
    cleanup
};