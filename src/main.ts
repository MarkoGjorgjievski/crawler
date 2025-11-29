// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from 'crawlee';

import { router } from './routes.js';

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 20,
});

// await crawler.addRequests([
//     { url: 'https://www.neptun.mk/', label: 'NEPTUN' },
//     // { url: 'https://www.tehnomarket.com.mk/', label: 'TEHNOMARKET' },
// ]);

await crawler.run(['https://www.neptun.mk/']);
