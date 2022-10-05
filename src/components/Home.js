import React, { useEffect } from 'react'
import * as nearAPI from 'near-api-js';
import { Form } from './Form'
import { simpleDrop } from './configs'
import { estimateRequiredDeposit } from './keypom-utils'
import { share } from '../utils/mobile'
import { generateSeedPhrase } from 'near-seed-phrase';

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
const contractId = 'v1.keypom.testnet';
const receiverId = contractId;

export const Home = ({ state, update, wallet }) => {

	const { near, drops, rootKey } = state


	const createNEARDrop = async (values) => {
		console.log(values)

		const DEPOSIT_PER_USE = parseNearAmount(values.Value.toString());
		const NUM_KEYS = parseInt(values['Number of Drops'].toString())
		const DROP_METADATA = Date.now().toString() // unique identifier for keys

		const {
			DROP_CONFIG,
			ATTACHED_GAS_FROM_WALLET,
			STORAGE_REQUIRED,
		} = simpleDrop;

		let requiredDeposit = await estimateRequiredDeposit(
			near,
			DEPOSIT_PER_USE,
			NUM_KEYS,
			DROP_CONFIG.uses_per_key,
			ATTACHED_GAS_FROM_WALLET,
			STORAGE_REQUIRED,
		)

		let keyPairs = [], pubKeys = [];
		for (var i = 0; i < NUM_KEYS; i++) {
			const keyPair = await genKey(rootKey, DROP_METADATA, i)
			keyPairs.push(keyPair)
			pubKeys.push(keyPair.publicKey.toString());
		}

		/// redirect with mynearwallet
		const res = wallet.signAndSendTransactions({
			transactions: [{
				receiverId: 'v1.keypom.testnet',
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'create_drop',
						args: {
							public_keys: pubKeys,
							deposit_per_use: DEPOSIT_PER_USE,
							config: DROP_CONFIG,
							metadata: JSON.stringify(DROP_METADATA)
						},
						gas: '100000000000000',
						deposit: requiredDeposit,
					}
				}]
			}]
		})
	}


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

	if (!rootKey) return <p>Make a Root Key first in Account tab</p>

	return <div>

		{drops.length > 0 ? <>
			<h4>Your Drops</h4>
			{
				drops.map(({ drop_id, keyPairs, keys }, i) => <div key={i}>
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
						const res = wallet.signAndSendTransactions({
							transactions: [{
								receiverId,
								actions: [{
									type: 'FunctionCall',
									params: {
										methodName: 'delete_keys',
										args: {
											drop_id,
											public_keys: keys.map(({ pk }) => pk),
										},
										gas: '100000000000000',
									}
								}]
							}]
						})
					}}>Delete Drop (reclaim funds)</button>
				</div>)
			}
		</>
		:
		<h4>No Drops Yet</h4>}

		<h4>Create NEAR Drop</h4>

		<Form {...{
			data: {
				Value: 1,
				['Number of Drops']: 1,
			},
			submitLabel: 'Create Drop',
			submit: createNEARDrop
		}} />

		{/* <p>Config</p>

		<button onClick={() => {

console.log(wallet.signAndSendTransactions)

		}}>Create Drop</button> */}

	</div>
}