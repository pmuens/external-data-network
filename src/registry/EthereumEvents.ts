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
  private _signature: string
  private _fromBlock: number

  constructor(url: string, address: string, signature: string, fromBlock: number) {
    this._url = url
    this._address = address
    this._signature = signature
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

    const event = `event ${this._signature}`
    const name = this._signature.match(/^(.+)\(/)![1]

    const provider = new ethers.providers.JsonRpcProvider(this._url)
    const contract = new ethers.Contract(this._address, [event], provider)
    const eventFilter = contract.filters[name]()
    const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)

    let maxBlockNumber = fromBlock

    const result: Output[] = []
    for (const item of events) {
      maxBlockNumber = Math.max(fromBlock, item.blockNumber)
      if (item.blockNumber > fromBlock) {
        const { address, event } = item
        result.push({
          address,
          event: event!,
          signature: item.eventSignature!,
          arguments: item.args!.map((arg) => arg.toString())
        })
      }
    }

    this._fromBlock = maxBlockNumber

    return Promise.resolve(result)
  }
}
