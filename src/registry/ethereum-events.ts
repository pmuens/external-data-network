/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'

export class EthereumEvents {
  private _url: string

  // NOTE: Keep in sync with types of returned items
  static types = {
    address: 'string',
    event: 'string',
    signature: 'string',
    arguments: 'string[]'
  }

  constructor(url: string) {
    this._url = url
  }

  async fetch(
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
