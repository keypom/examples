import { State } from '../utils/state';

import { initNear } from './near';
import { get } from '../utils/store'

export const ROOT_KEY = '__ROOT_KEY'
export const contractId = 'v1.keypom.testnet';
export const receiverId = contractId;
// example
const initialState = {
	app: {
		mounted: false,
		menu: false,
	},
	drops: [],
	ftBalance: '0',
	nftBalance: [],
	rootKey: get(ROOT_KEY)
};

export const { appStore, AppProvider } = State(initialState, 'app');

// example app function
export const onAppMount = (message) => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	
	dispatch(initNear());
};
