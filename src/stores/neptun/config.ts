import { createPlaywrightRouter, PlaywrightCrawlerOptions, Request } from 'crawlee';

const router = createPlaywrightRouter();
export const config: PlaywrightCrawlerOptions & { initialRequest: Partial<Request>} = {
    requestHandler: router,
    maxRequestsPerCrawl: 200,
    maxConcurrency: 5,
    autoscaledPoolOptions: {
        desiredConcurrency: 5,
    },
    initialRequest: {
        url: 'https://www.neptun.mk/Product/GetPricelist',
        label: 'PRICELIST',
        userData: {
            currentPage: 1,
            itemsPerPage: 5,
            maxPages: 2,
        }
    }
}