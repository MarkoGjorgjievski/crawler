import {
	createPlaywrightRouter,
	PlaywrightCrawlerOptions,
	Request,
} from 'crawlee';

const router = createPlaywrightRouter();
export const config: PlaywrightCrawlerOptions & {
	initialRequest: Partial<Request>;
} = {
	requestHandler: router,
	maxRequestsPerCrawl: 1000,
	maxConcurrency: 5,
	autoscaledPoolOptions: {
		desiredConcurrency: 5,
	},
	initialRequest: {
		url: 'https://www.setec.mk',
		label: 'EXTRACT_CATEGORIES',
		userData: {
			currentPage: 1,
			itemsPerPage: 3,
			maxPages: 2, // Stop after this many pages per category
		},
	},
};
