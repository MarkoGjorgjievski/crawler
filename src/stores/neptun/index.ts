import { router } from './routes.js';
import { config } from './config.js';
import { Store } from '../../types.js';

export const neptun: Store = {
	name: 'Neptun',
	router,
	config,
};
