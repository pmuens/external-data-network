/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

import { DataType } from '../host/types'
import { Source } from '../host/interfaces'

export class EthereumEvents implements Source {
  private _url: string
  private _address: string
  private _signature: string

  name = EthereumEvents.name

  constructor(url: string, address: string, signature: string) {
    this._url = url
    this._address = address
    this._signature = signature
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
    const fromBlock = 0
    const toBlock = 'latest'

    const event = `event ${this._signature}`
    const name = this._signature.match(/^(.+)\(/)![1]

    const provider = new ethers.providers.JsonRpcProvider(this._url)
    const contract = new ethers.Contract(this._address, [event], provider)
    const eventFilter = contract.filters[name]()
    const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)

    const result: Data[] = events.map((item) => {
      const { address, event } = item
      const result: Data = {
        address,
        event: event!,
        signature: item.eventSignature!,
        arguments: item.args!.map((arg) => arg.toString())
      }
      return result
    })

    return (Promise.resolve(result) as unknown) as Promise<T[]>
  }
}

type Data = {
  address: string
  event: string
  signature: string
  arguments: string[]
}
