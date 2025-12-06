import {
	createPlaywrightRouter,
	PlaywrightCrawlerOptions,
	Request,
} from 'crawlee';
import { Store } from '../../types.js';

const router = createPlaywrightRouter();
export const config: Store['config'] = {
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
		},
	},
};
