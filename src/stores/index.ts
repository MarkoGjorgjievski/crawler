import { neptun } from './neptun/index.js';
import { setec } from './setec/index.js';
import { tehnomarket } from './tehnomarket/index.js'
import { anhoch } from './anhoch/index.js'
import { Store } from '../types.js';

export const stores: Record<string, Store> = {
	neptun,
	setec,
	tehnomarket,
	anhoch,
};
