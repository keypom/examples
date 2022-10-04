import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/app.js';
import { HashRouter } from "react-router-dom";

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<AppProvider>
	<HashRouter>
		<App />
	</HashRouter>
</AppProvider>);
