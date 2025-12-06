import { createPlaywrightRouter } from 'crawlee';
import { Store } from '../../types.js';

const router = createPlaywrightRouter();
export const config: Store['config'] = {
    requestHandler: router,
    maxRequestsPerCrawl: 1000,
    maxConcurrency: 5,
    autoscaledPoolOptions: {
        desiredConcurrency: 5,
    },
    initialRequest: {
        url: 'https://www.tehnomarket.com.mk',
        label: 'EXTRACT_CATEGORIES',
        userData: {
            currentPage: 1,
            itemsPerPage: 3,
            maxPages: 2, // Stop after this many pages per category
        },
    },
};
