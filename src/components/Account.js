
import React, { useEffect } from 'react'

import { contractId, receiverId } from '../state/app';
import {
	useNavigate,
} from "react-router-dom";
import { ROOT_KEY } from "../state/app"
import { set, file } from '../utils/store'
import { generateSeedPhrase } from "near-seed-phrase"
import { formatNearAmount } from 'near-api-js/lib/utils/format';

export const Account = ({ state, update, wallet }) => {

	const navigate = useNavigate();
	const { rootKey, balance } = state

	const onMount = async () => {
		const balance = await wallet.viewFunction({
			contractId,
			methodName: 'get_user_balance',
			args: {
				account_id: wallet.accountId,
			},
		})
		console.log(balance)
		update('balance', balance)
	}
	useEffect(() => {
		onMount()
	}, [])

	return <>
		<h4>Balance</h4>
		<p>{formatNearAmount(balance, 4)}</p>
		<button className="outline" onClick={() => {
			const res = wallet.signAndSendTransactions({
				transactions: [{
					receiverId: 'v1.keypom.testnet',
					actions: [{
						type: 'FunctionCall',
						params: {
							methodName: 'withdraw_from_balance',
							args: {},
							gas: '100000000000000',
						}
					}]
				}]
			})
		}}>Withdraw Balance</button>
		<h4>Root Key</h4>
		<p>Used to generate your links. If you lose it, you can still delete your drop and reclaim funds.</p>
		{rootKey
			? <>
				<button className="outline" onClick={() => window.prompt('Copy this somewhere safe! Do NOT lose it!', rootKey)}>Copy</button>
				<button className="outline" onClick={() => file('KeypomRootKey.txt', rootKey)}>Save as File</button>
				<button className="outline" onClick={() => {
					const seedPhrase = window.prompt('WARNING! First save your existing root key or you will NOT be able to share any links!')
					if (!seedPhrase || seedPhrase.length === 0 || seedPhrase.split(' ').filter((w) => w.length > 1).length !== 12) return alert('invalid key')
					set(ROOT_KEY, seedPhrase)
					update('rootKey', seedPhrase)
				}}>!!! Update Key !!!</button>
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