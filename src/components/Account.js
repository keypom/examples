import {
	useNavigate,
} from "react-router-dom";
import { ROOT_KEY } from "../state/app"
import { set, file } from '../utils/store'
import { generateSeedPhrase } from "near-seed-phrase"

export const Account = ({ state, update, wallet }) => {

	const navigate = useNavigate();
	const { rootKey } = state

	return <>
		<h4>App</h4>
		{rootKey
			? <>
<button className="outline" onClick={() => window.prompt('Copy this somewhere safe', rootKey)}>Copy</button>
<button className="outline" onClick={() => file('KeypomRootKey.txt', rootKey)}>Save</button>
			</>
			: <button className="outline" onClick={() => {
				const { seedPhrase } = generateSeedPhrase()
				set(ROOT_KEY, seedPhrase)
				update('rootKey', seedPhrase)
			}}>Create Root Key</button>
		}
		<h4>Wallet</h4>
		<p>Signed in as: {wallet.accountId}</p>
		<button onClick={() => {
			wallet.signOut()
			navigate('/')
		}}>Sign Out</button>
	</>
}