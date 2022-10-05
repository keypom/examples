import React, { useContext, useEffect } from 'react';
import {
	Routes,
	Route,
	useLocation,
} from "react-router-dom";

import { appStore, onAppMount } from './state/app';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { Account } from './components/Account';
import { Modal } from './components/Modal';

import './css/modal-ui.css';
import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const { app, wallet } = state
	const { menu } = app
	const { pathname } = useLocation();

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);

	const routeArgs = {
		state, update, wallet
	}

	return (
		<div>
			<Modal {...{ state, update }} />
			<Header {...{ pathname, menu, wallet, update }} />
			{
				wallet &&
				<main>
					<Routes>
				{
					wallet.accountId ?
					/* Account Paths */
					<>
						<Route path="/account" element={<Account {...routeArgs} />} />
						<Route path="/" element={<Home {...routeArgs} />} />
					</>
								
							
					:
					/* Public Paths */
					<>
						<Route path="/" element={
							<>
								<p>Please sign in to get started</p>
								<button onClick={() => wallet.signIn()}>Sign In</button>
							</>
						} />
					</>
				}
					</Routes>
				</main>
			}
		</div>
	);
};

export default App;
