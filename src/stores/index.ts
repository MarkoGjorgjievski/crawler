import { neptun } from './neptun/index.js';
import { setec } from './setec/index.js';
import { Store } from '../types.js';

export const stores: Record<string, Store> = {
	neptun,
	setec,
};
