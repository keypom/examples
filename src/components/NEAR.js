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

export const NEAR = ({ state, update, wallet }) => {

	const { near, drops, ftBalance, rootKey } = state
	const navigate = useNavigate();

	/// Main Event Handlers

	const createSimpleDrop = async (values) => {
		console.log(values)

		const DEPOSIT_PER_USE = parseNearAmount(values['NEAR Value'].toString());
		const NUM_KEYS = parseInt(values['Number of Drops'].toString())
		const DROP_METADATA = Date.now().toString() // unique identifier for keys

		const {
			DROP_CONFIG,
			STORAGE_REQUIRED,
		} = simpleDrop;

		let requiredDeposit = await estimateRequiredDeposit({
			near,
			depositPerUse: DEPOSIT_PER_USE,
			numKeys: NUM_KEYS,
			usesPerKey: DROP_CONFIG.uses_per_key,
			attachedGas: ATTACHED_GAS_FROM_WALLET,
			storage: STORAGE_REQUIRED,
		})

		// console.log(formatNearAmount(requiredDeposit, 6))

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
						gas: '300000000000000',
						deposit: requiredDeposit,
					}
				}]
			}]
		})
	}

	/// Render

	if (!rootKey) return <p>Make a Root Key first in Account tab</p>

	return <div>

	<button onClick={() => navigate('/')}>Drops</button>

		<h4>Create NEAR Drop</h4>

		<Form {...{
			data: {
				['NEAR Value']: 1,
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
			submitLabel: 'Create NEAR Drop',
			submit: createSimpleDrop
		}} />

	</div>
}