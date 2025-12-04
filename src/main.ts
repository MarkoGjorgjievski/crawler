import { PlaywrightCrawler, Dataset, Request, RouterHandler, PlaywrightCrawlingContext, PlaywrightCrawlerOptions } from 'crawlee';
import { Command } from 'commander';
import { router as neptunRouter, config as neptunConfig } from './stores/neptun/index.js';

// Define store config type
interface StoreConfig {
    name: string;
    baseUrl: string;
    maxRequests: number;
    concurrency: number;
    initialRequest: {
        url: string;
        label: string;
        userData: Record<string, any>;
    };
}

interface Store {
    name: string;
    router: RouterHandler<PlaywrightCrawlingContext>;
    config: PlaywrightCrawlerOptions & { initialRequest: Partial<Request>};
}

// Store registry
const stores: Record<string, Store> = {
    neptun: {
        name: 'Neptun.mk',
        router: neptunRouter,
        config: neptunConfig,
    }
    // Add more stores here
};

async function scrapeStore(storeName: string) {
    const store = stores[storeName];
    
    if (!store) {
        console.error(`❌ Store "${storeName}" not found!`);
        console.log(`Available stores: ${Object.keys(stores).join(', ')}`);
        process.exit(1);
    }

    console.log(`\n🚀 Starting scraper for: ${store.name}`);
    console.log(`⚙️  Config:`, store.config);

    const crawler = new PlaywrightCrawler({
        requestHandler: store.router,
        maxRequestsPerCrawl: store.config.maxRequestsPerCrawl,
        maxConcurrency: store.config.maxConcurrency,
        minConcurrency: 1,
        sameDomainDelaySecs: 0,
    });

    // Add initial request
    await crawler.addRequests([store.config.initialRequest]);

    await crawler.run();

    // Export data with store-specific filename
    console.log(`\n💾 Exporting data...`);
    const dataset = await Dataset.open();
    const filename = `${storeName}_products_${new Date().toISOString().split('T')[0]}`;
    await dataset.exportToJSON(filename);
    
    console.log(`✅ Scraping completed for ${store.name}!`);
    console.log(`📁 Data saved to: storage/datasets/default/${filename}.json\n`);
}

async function scrapeAll() {
    console.log(`\n🔄 Scraping all stores...`);
    
    for (const storeName of Object.keys(stores)) {
        try {
            await scrapeStore(storeName);
        } catch (error) {
            console.error(`❌ Error scraping ${storeName}:`, error);
        }
    }
    
    console.log(`\n✅ All stores completed!`);
}

async function main() {
    const program = new Command();

    program
        .name('store-scraper')
        .description('CLI tool to scrape multiple e-commerce stores')
        .version('1.0.0');

    program
        .option('-s, --store <name>', 'Scrape a specific store')
        .option('-a, --all', 'Scrape all stores')
        .option('-l, --list', 'List available stores');

    program.parse();

    const options = program.opts();

    if (options.list) {
        console.log('\n📋 Available stores:');
        Object.entries(stores).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value.name}`);
        });
        return;
    }

    if (options.all) {
        await scrapeAll();
        return;
    }

    if (options.store) {
        await scrapeStore(options.store);
        return;
    }

    // No options provided, show help
    program.help();
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});