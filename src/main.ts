import { PlaywrightCrawler, Dataset } from 'crawlee';
import { router } from './routes.js';

const crawler = new PlaywrightCrawler({
    requestHandler: router,
    // Disable browser headless mode for debugging (optional)
    // headless: false,
    maxRequestsPerCrawl: 200, // Limit to prevent runaway crawling (10 pages + 100 products)
    maxConcurrency: 5, // Process 5 requests concurrently
    // Don't wait for all requests to be added before starting
    autoscaledPoolOptions: {
        desiredConcurrency: 5,
    },
});

async function main() {
    console.log('Starting Neptun.mk scraper...');
    
    // Add the initial request to start pagination
    await crawler.addRequests([
        {
            url: 'https://www.neptun.mk/Product/GetPricelist',
            label: 'PRICELIST',
            userData: {
                currentPage: 1,
                itemsPerPage: 5,
                maxPages: 2, // Fetch 10 pages
            },
        },
    ]);

    await crawler.run();

    // Export data to JSON file
    console.log('Exporting data to local storage...');
    const dataset = await Dataset.open();
    await dataset.exportToJSON('neptun_products');
    
    console.log('Scraping completed! Data saved to storage/datasets/default/neptun_products.json');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});