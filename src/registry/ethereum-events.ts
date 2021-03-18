/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

import { OutputTypeDef } from '../host/types'
import { Source } from '../host/interfaces'

// NOTE: Keep these in sync
const OutputType: OutputTypeDef = {
  address: 'string',
  event: 'string',
  signature: 'string',
  arguments: 'string[]'
}
export type Output = {
  address: string
  event: string
  signature: string
  arguments: string[]
}

export class EthereumEvents implements Source<Output> {
  private _url: string
  private _address: string
  private _signature: string
  private _fromBlock: number

  name = EthereumEvents.name

  constructor(url: string, address: string, signature: string, fromBlock: number) {
    this._url = url
    this._address = address
    this._signature = signature
    this._fromBlock = fromBlock
  }

  getOutputType(): OutputTypeDef {
    return OutputType
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

    const result: Output[] = events.map((item) => {
      maxBlockNumber = Math.max(maxBlockNumber, item.blockNumber)
      const { address, event } = item
      const result: Output = {
        address,
        event: event!,
        signature: item.eventSignature!,
        arguments: item.args!.map((arg) => arg.toString())
      }
      return result
    })

    this._fromBlock = maxBlockNumber

    return Promise.resolve(result)
  }
}
