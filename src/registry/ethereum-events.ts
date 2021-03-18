/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

import { DataType } from '../host/types'
import { Source } from '../host/interfaces'

export class EthereumEvents implements Source {
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

  getOutputDataType(): DataType {
    return {
      address: 'string',
      event: 'string',
      signature: 'string',
      arguments: 'string[]'
    }
  }

  async read<T>(): Promise<T[]> {
    const fromBlock = this._fromBlock
    const toBlock = 'latest'

    const event = `event ${this._signature}`
    const name = this._signature.match(/^(.+)\(/)![1]

    const provider = new ethers.providers.JsonRpcProvider(this._url)
    const contract = new ethers.Contract(this._address, [event], provider)
    const eventFilter = contract.filters[name]()
    const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)

    let maxBlockNumber = fromBlock

    const result: Data[] = events.map((item) => {
      maxBlockNumber = Math.max(maxBlockNumber, item.blockNumber)
      const { address, event } = item
      const result: Data = {
        address,
        event: event!,
        signature: item.eventSignature!,
        arguments: item.args!.map((arg) => arg.toString())
      }
      return result
    })

    this._fromBlock = maxBlockNumber

    return (Promise.resolve(result) as unknown) as Promise<T[]>
  }
}

type Data = {
  address: string
  event: string
  signature: string
  arguments: string[]
}
