import React from 'react'
import {
	Link,
} from "react-router-dom";

import './Header.scss';

import { Menu } from 'react-feather';

const Links = ({ update, wallet }) => {
	const hideMenu = () => update('app.menu', false)

	return <nav>
		<Link onClick={hideMenu} to="/">Home</Link>
		{
			wallet?.accountId && <>
				<Link onClick={hideMenu} to="/near">NEAR</Link>
				<Link onClick={hideMenu} to="/ft">FT</Link>
				<Link onClick={hideMenu} to="/nft">NFT</Link>
				<Link onClick={hideMenu} to="/account">Account</Link>
			</>
		}
		<a onClick={() => window.open('https://github.com/keypom/examples')}>GH</a>
	</nav>
}

export const Header = ({ pathname, menu, wallet, update }) => {
	return <header>
		<div>
			<p>
				<Link to="/">Keypom Examples</Link> { pathname.length > 1 && '/ ' + pathname.substring(1) }
			</p>
		</div>
		<div>
			<Menu onClick={() => update('app', { menu: !menu })} />
			<Links {...{ update, wallet }} />
		</div>
		{menu && window.innerWidth < 768 && <Links {...{ update, wallet }} />}
	</header>
}