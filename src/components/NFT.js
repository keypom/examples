import React, { useEffect } from 'react'
import * as nearAPI from 'near-api-js';
import { BN } from 'bn.js'
import { Form } from './Form'
import { simpleDrop } from '../configs/simple'
import { nftDrop, NFT_CONTRACT_ID, NFT_METADATA } from '../configs/nft'
import { estimateRequiredDeposit, ATTACHED_GAS_FROM_WALLET } from '../configs/keypom-utils'
import { share } from '../utils/mobile'
import { generateSeedPhrase } from 'near-seed-phrase';

import {
	useNavigate
} from "react-router-dom";
import { contractId, receiverId } from '../state/app';
import { networkId } from '../state/near';
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

export const NFT = ({ state, update, wallet }) => {

	const { near, nftBalance, rootKey } = state
	const navigate = useNavigate();

	const onMount = async () => {

		const nftBalance = await wallet.viewFunction({
			contractId: NFT_CONTRACT_ID,
			methodName: 'nft_tokens_for_owner',
			args: {
				account_id: wallet.accountId
			}
		})
		update('nftBalance', nftBalance)
	}
	useEffect(() => {
		onMount()
	}, [])

	console.log(nftBalance)

	/// Main Event Handlers

	const handleGetNFT = async () => {
		let tokenId = `Keypom-${Date.now()}`;

		const res = wallet.signAndSendTransactions({
			transactions: [{
				receiverId: NFT_CONTRACT_ID,
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'nft_mint',
						args: {
							receiver_id: wallet.accountId,
							metadata: NFT_METADATA,
							token_id: tokenId,
						},
						gas: '100000000000000',
						deposit: parseNearAmount('0.1')
					}
				}]
			}]
		})
	}

	const handleRemoveNFTs = async () => {
		const actions = []
		for (let i = 0; i < Math.min(nftBalance.length, 6); i++) {
			actions.push({
				type: 'FunctionCall',
				params: {
					methodName: 'nft_transfer',
					args: {
						receiver_id: networkId === 'testnet' ? 'testnet' : 'near',
						token_id: nftBalance[i].token_id,
					},
					gas: '50000000000000',
					deposit: '1',
				}
			})
		}
		const res = wallet.signAndSendTransactions({
			transactions: [{
				receiverId: NFT_CONTRACT_ID,
				actions,
			}]
		})
	}

	const createNFTDrop = async (values) => {

		const tokenId = values['NFT Token ID'];
		const DEPOSIT_PER_USE = parseNearAmount(values['NEAR Value'].toString());
		const NUM_KEYS = parseInt(values['Number of Drops'].toString())
		const DROP_METADATA = Date.now().toString() // unique identifier for keys

		const {
			DROP_CONFIG,
			STORAGE_REQUIRED,
			NFT_DATA,
		} = nftDrop;

		NFT_DATA.sender_id = wallet.accountId

		let requiredDeposit = await estimateRequiredDeposit({
			near,
			depositPerUse: DEPOSIT_PER_USE,
			numKeys: NUM_KEYS,
			usesPerKey: DROP_CONFIG.uses_per_key,
			attachedGas: ATTACHED_GAS_FROM_WALLET,
			storage: STORAGE_REQUIRED,
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

		// return console.log(nextDropId, tokenId)

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
							nft_data: NFT_DATA,
						},
						gas: '250000000000000',
						deposit: requiredDeposit,
					}
				}]
			}, {
				receiverId: NFT_CONTRACT_ID,
				actions: [{
					type: 'FunctionCall',
					params: {
						methodName: 'nft_transfer_call',
						args: {
							receiver_id: contractId,
							token_id: tokenId,
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

		<h4>NFTs</h4>
		{
			nftBalance.length === 0 && <p>No NFTs yet. Click 'Get NFT'.</p>
		}
		{
			nftBalance.map(({ token_id, metadata: { title, description, media } }) => {
				return <div className="nft" key={token_id}>
					<p>{token_id}</p>
					<p>{title}</p>
					<p>{description}</p>
					<img src={media} />
				</div>
			})
		}
		<button className="outline" onClick={handleGetNFT}>Get NFT</button>
		{
			nftBalance.length > 0 && <button className="outline" onClick={handleRemoveNFTs}>Remove NFTs</button>
		}

		{nftBalance.length > 0 && <>

			<h4>Create NFT Drop</h4>

			<Form {...{
				data: {
					['NFT Token ID']: nftBalance[0].token_id,
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
				submitLabel: 'Create NFT Drop',
				submit: createNFTDrop,
				submitDisabled: nftBalance.length === 0,
			}} />

		</>}

	</div>
}