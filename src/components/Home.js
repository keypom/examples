import React, { useEffect } from 'react'
import * as nearAPI from 'near-api-js';
import { Form } from './Form'
import { simpleDrop } from '../configs/simple'
import { ftDrop, FT_CONTRACT_ID } from '../configs/ft'
import { estimateRequiredDeposit } from './keypom-utils'
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

		const ftBalance = await wallet.viewFunction({
			contractId: FT_CONTRACT_ID,
			methodName: 'ft_balance_of',
			args: {
				account_id: wallet.accountId
			}
		})

		console.log('drops', drops)

		update('drops', drops)
		update('ftBalance', ftBalance)
	}
	useEffect(() => {
		onMount()
	}, [])

	/// Main Event Handlers

	const createSimpleDrop = async (values) => {
		console.log(values)

		const DEPOSIT_PER_USE = parseNearAmount(values['NEAR Value'].toString());
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

	const handleGetFTs = async () => {
		const res = wallet.signAndSendTransactions({
			transactions: [{
				receiverId: FT_CONTRACT_ID,
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'storage_deposit',
						args: {
							account_id: wallet.accountId,
						},
						gas: '100000000000000',
						deposit: parseNearAmount('0.1')
					}
				}]
			}, {
				receiverId: FT_CONTRACT_ID,
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'ft_mint',
						args: {
							account_id: wallet.accountId,
							// The max amount of tokens an account can receive PER `ft_transfer` call is 10
							amount: parseNearAmount("100")
						},
						gas: '100000000000000',
					}
				}]
			}]
		})
	}

	const createFTDrop = async (values) => {
		console.log(values)

		const DEPOSIT_PER_USE = parseNearAmount(values['NEAR Value'].toString());
		const NUM_KEYS = parseInt(values['Number of Drops'].toString())
		const DROP_METADATA = Date.now().toString() // unique identifier for keys

		const {
			DROP_CONFIG,
			ATTACHED_GAS_FROM_WALLET,
			STORAGE_REQUIRED,
			FT_DATA,
		} = ftDrop;

		FT_DATA.balance_per_use = parseNearAmount(values['FT Value'].toString());
		FT_DATA.sender_id = wallet.accountId

		let requiredDeposit = await estimateRequiredDeposit(
			near,
			DEPOSIT_PER_USE,
			NUM_KEYS,
			DROP_CONFIG.uses_per_key,
			ATTACHED_GAS_FROM_WALLET,
			STORAGE_REQUIRED,
			null,
			FT_DATA
		)

		// console.log(formatNearAmount(requiredDeposit))

		let keyPairs = [], pubKeys = [];
		for (var i = 0; i < NUM_KEYS; i++) {
			const keyPair = await genKey(rootKey, DROP_METADATA, i)
			keyPairs.push(keyPair)
			pubKeys.push(keyPair.publicKey.toString());
		}

		/// redirect with mynearwallet
		const nextDropId = await wallet.viewFunction({
			contractId,
			methodName: 'get_next_drop_id'
		})
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
							metadata: JSON.stringify(DROP_METADATA),
							ft_data: FT_DATA,
						},
						gas: '100000000000000',
						deposit: requiredDeposit,
					}
				}]
			}, {
				receiverId: FT_CONTRACT_ID,
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'ft_transfer_call',
						args: {
							receiver_id: contractId,
							amount: FT_DATA.balance_per_use,
							msg: nextDropId.toString(),
						},
						gas: '100000000000000',
						deposit: '1',
					}
				}]
			}]
		})
	}

	/// Render

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
				['NEAR Value']: 1,
				['Number of Drops']: 1,
			},
			submitLabel: 'Create NEAR Drop',
			submit: createSimpleDrop
		}} />

		<h4>Create FT Drop</h4>

		<p>Balance { formatNearAmount(ftBalance, 4) }</p>
		<button className="outline" onClick={handleGetFTs}>Get 100 FTs</button>

		<Form {...{
			data: {
				['FT Value']: 10,
				['NEAR Value']: 0.2,
				['Number of Drops']: 1,
			},
			submitLabel: 'Create FT Drop',
			submit: createFTDrop
		}} />

	</div>
}