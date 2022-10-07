import React, { useEffect } from 'react'
import * as nearAPI from 'near-api-js';
import { BN } from 'bn.js'
import { Form } from './Form'
import { simpleDrop } from '../configs/simple'
import { ftDrop, FT_CONTRACT_ID } from '../configs/ft'
import { estimateRequiredDeposit, ATTACHED_GAS_FROM_WALLET } from '../configs/keypom-utils'
import { share } from '../utils/mobile'
import { generateSeedPhrase } from 'near-seed-phrase';

import { contractId, receiverId } from '../state/app';
const {
	KeyPair,
	utils: { format: { parseNearAmount, formatNearAmount } },
} = nearAPI

const hashBuf = (str) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
const genKey = async (rootKey, meta, nonce) => {
	const hash = await hashBuf(`${rootKey}_${meta}_${nonce}`)
	const { secretKey } = generateSeedPhrase(hash)
	return KeyPair.fromString(secretKey)
}

export const Home = ({ state, update, wallet }) => {

	const { near, drops, ftBalance, rootKey } = state

	const onMount = async () => {
		const drops = await wallet.viewFunction({
			contractId,
			methodName: 'get_drops_for_owner',
			args: {
				account_id: wallet.accountId,
			},
		})

		await Promise.all(drops.map(async (drop, i) => {
			const { drop_id } = drop
			drop.keys = await wallet.viewFunction({
				contractId,
				methodName: 'get_keys_for_drop',
				args: {
					drop_id
				}
			})
			drop.keyPairs = await Promise.all(drop.keys.map((_, i) => genKey(rootKey, drop.metadata.replaceAll(`\"`, ``), i)))
		}))

		console.log('drops', drops)

		update('drops', drops)
	}
	useEffect(() => {
		onMount()
	}, [])

	/// Render

	if (!rootKey) return <p>Make a Root Key first in Account tab</p>

	return <div>

		{drops.length > 0 ? <>
			<h4>Your Drops</h4>
			{
				drops.map(({ drop_id, drop_type, keyPairs, keys }, i) => <div key={i}>
					<p>Drop ID: {drop_id}</p>
					<h4>Keys</h4>
					{keyPairs.map(({ publicKey, secretKey }, i) => <div className="grid sm" key={i}>
						<div>
							{publicKey.toString()}
						</div>
						<div>
							<button className="outline" onClick={() => {
								const link = `https://testnet.mynearwallet.com/linkdrop/${contractId}/${secretKey}`
								const { mobile } = share(link)
								if (!mobile) alert('Link Copied')
							}}>Share Link</button>
						</div>
					</div>)}
					<button className="outline" onClick={() => {
						const actions = []
						if (drop_type.FungibleToken || drop_type.NonFungibleToken) {
							actions.push({
								type: 'FunctionCall',
								params: {
									methodName: 'refund_assets',
									args: {
										drop_id,
									},
									gas: '100000000000000',
								}
							})
						}
						actions.push({
							type: 'FunctionCall',
							params: {
								methodName: 'delete_keys',
								args: {
									drop_id,
									public_keys: keys.map(({ pk }) => pk),
								},
								gas: '100000000000000',
							}
						}, {
							type: 'FunctionCall',
							params: {
								methodName: 'withdraw_from_balance',
								args: {},
								gas: '100000000000000',
							}
						})

						const res = wallet.signAndSendTransactions({
							transactions: [{
								receiverId,
								actions
							}]
						})
					}}>Delete Drop (reclaim funds)</button>
				</div>)
			}
		</>
		:
		<h4>No Drops Yet</h4>}

	</div>
}