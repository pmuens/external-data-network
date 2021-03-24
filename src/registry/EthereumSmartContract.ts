import dotenv from 'dotenv'
import { ethers } from 'ethers'

import { Destination } from '../host'

dotenv.config()

const { ETHEREUM_RPC_URL, ETHEREUM_MNEMONIC } = process.env

export type Input = {
  address: string
  abi: ethers.ContractInterface
  function: string
  args: unknown[]
}

export class EthereumSmartContract implements Destination {
  getInputExample(): Input {
    return {
      address: '0x0123456789abcdef',
      abi: [
        {
          inputs: [{ name: 'id', type: 'uint256' }],
          name: 'setId',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      function: 'setId',
      args: ['42']
    }
  }

  async write(data: Input[]): Promise<number> {
    const mnemonic = ETHEREUM_MNEMONIC as string
    const url = ETHEREUM_RPC_URL as string
    const signer = getSigner(mnemonic, url)

    let processed = 0

    for (const item of data) {
      const contract = new ethers.Contract(item.address, item.abi, signer)
      try {
        await contract[item.function](...item.args)
      } catch (e) {
        // TODO: Add proper error handling
        continue
      }
      processed++
    }

    return Promise.resolve(processed)
  }
}

function getSigner(mnemonic: string, url: string) {
  const provider = new ethers.providers.JsonRpcProvider(url)
  const wallet = ethers.Wallet.fromMnemonic(mnemonic)
  wallet.connect(provider)
  return provider.getSigner()
}
