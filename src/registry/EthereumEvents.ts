/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

import { Source } from '../host'

export type Output = {
  address: string
  event: string
  signature: string
  arguments: string[]
}

export class EthereumEvents implements Source {
  private _url: string
  private _address: string
  private _signatures: string[]
  private _fromBlock: number

  constructor(url: string, address: string, signatures: string[], fromBlock: number) {
    for (let signature of signatures) {
      signature = signature.trim()
      if (signature.startsWith('event')) {
        throw new Error(
          `The Ethereum event signature shouldn't start with "event" -> "${signature}"`
        )
      } else if (signature.endsWith(';')) {
        throw new Error(`The Ethereum event signature shouldn't end with ";" -> "${signature}"`)
      }
    }

    this._url = url
    this._address = address
    this._signatures = signatures
    this._fromBlock = fromBlock
  }

  getOutputExample(): Output {
    return {
      address: '0x0123456789abcdef',
      event: 'MyEvent',
      signature: 'MyEvent(address,uint8)',
      arguments: ['0x0123456789abcdef', '42']
    }
  }

  async read(): Promise<Output[]> {
    const fromBlock = this._fromBlock
    const toBlock = 'latest'

    const abi = this._signatures.map((signature) => `event ${signature}`)

    const provider = new ethers.providers.JsonRpcProvider(this._url)
    const iface = new ethers.utils.Interface(abi)

    const topics = this._signatures.map((signature) => {
      const name = signature.match(/^(.+)\(/)![1]
      return iface.getEventTopic(name)
    })

    const logs = await provider.getLogs({
      address: this._address,
      topics: [topics],
      fromBlock,
      toBlock
    })

    let maxBlockNumber = fromBlock

    const result: Output[] = []
    for (const log of logs) {
      maxBlockNumber = Math.max(fromBlock, log.blockNumber)
      if (log.blockNumber > fromBlock) {
        const event = iface.parseLog(log)
        const { address } = log
        result.push({
          address,
          event: event.name,
          signature: event.signature,
          arguments: event.args.map((arg) => arg.toString())
        })
      }
    }

    this._fromBlock = maxBlockNumber

    return result
  }
}
