/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

import { DataType } from '../host/types'
import { Source } from '../host/interfaces'

export class EthereumEvents implements Source {
  private _url: string
  private _address: string
  private _event: string

  name = EthereumEvents.name

  constructor(url: string, address: string, event: string) {
    this._url = url
    this._address = address
    this._event = event
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
    return (this._fetch(this._address, this._event) as unknown) as Promise<T[]>
  }

  private async _fetch(
    address: string,
    event: string,
    opts: Options = { toBlock: 'latest' }
  ): Promise<Data[]> {
    const { fromBlock, toBlock } = opts

    const provider = new ethers.providers.JsonRpcProvider(this._url)
    const contract = new ethers.Contract(address, [event], provider)
    const eventFilter = contract.filters.Birth()
    const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)

    return events.map((item) => {
      const { address, event } = item
      const result: Data = {
        address,
        event: event!,
        signature: item.eventSignature!,
        arguments: item.args!.map((arg) => arg.toString())
      }
      return result
    })
  }
}

type Data = {
  address: string
  event: string
  signature: string
  arguments: string[]
}

type Options = {
  fromBlock?: number
  toBlock: number | string
}
