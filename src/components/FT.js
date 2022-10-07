import React, { useEffect } from 'react'
import * as nearAPI from 'near-api-js';
import { BN } from 'bn.js'
import { Form } from './Form'
import { simpleDrop } from '../configs/simple'
import { ftDrop, FT_CONTRACT_ID } from '../configs/ft'
import { estimateRequiredDeposit, ATTACHED_GAS_FROM_WALLET } from '../configs/keypom-utils'
import { share } from '../utils/mobile'
import { generateSeedPhrase } from 'near-seed-phrase';

import {
	useNavigate
} from "react-router-dom";
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

export const FT = ({ state, update, wallet }) => {

	const { near, drops, ftBalance, rootKey } = state
	const navigate = useNavigate();

	const onMount = async () => {
		
		const ftBalance = await wallet.viewFunction({
			contractId: FT_CONTRACT_ID,
			methodName: 'ft_balance_of',
			args: {
				account_id: wallet.accountId
			}
		})
		update('ftBalance', ftBalance)
	}
	useEffect(() => {
		onMount()
	}, [])

	/// Main Event Handlers

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
			STORAGE_REQUIRED,
			FT_DATA,
		} = ftDrop;

		FT_DATA.balance_per_use = parseNearAmount(values['FT Value'].toString());
		FT_DATA.sender_id = wallet.accountId

		let requiredDeposit = await estimateRequiredDeposit({
			near,
			depositPerUse: DEPOSIT_PER_USE,
			numKeys: NUM_KEYS,
			usesPerKey: DROP_CONFIG.uses_per_key,
			attachedGas: ATTACHED_GAS_FROM_WALLET,
			storage: STORAGE_REQUIRED,
			ftData: FT_DATA,
		})

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
						gas: '250000000000000',
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
							amount: new BN(FT_DATA.balance_per_use).mul(new BN(NUM_KEYS)).toString(),
							msg: nextDropId.toString(),
						},
						gas: '50000000000000',
						deposit: '1',
					}
				}]
			}]
		})
	}

	/// Render

	if (!rootKey) return <p>Make a Root Key first in Account tab</p>

	return <div>

		<button onClick={() => navigate('/')}>Drops</button>

		<p>Balance { formatNearAmount(ftBalance, 4) }</p>
		<button className="outline" onClick={handleGetFTs}>Get 100 FTs</button>

		<h4>Create FT Drop</h4>

		<Form {...{
			data: {
				['FT Value']: 10,
				['NEAR Value']: 0.2,
				['Number of Drops']: 1,
			},
			minMax: {
				['NEAR Value']: {
					min: 0.2,
					step: 0.1
				},
				['Number of Drops']: {
					min: 1,
					max: 50
				},
			},
			submitLabel: 'Create FT Drop',
			submit: createFTDrop,
			submitDisabled: ftBalance === '0'
		}} />

	</div>
}