import fetch from 'node-fetch'

import { Source } from '../../src/host'

export type Output = {
  base: string
  quote: string
  value: number
}

export class CoinGeckoPrice implements Source {
  private _base: string
  private _quote: string

  constructor(base: string, quote: string) {
    this._base = base
    this._quote = quote
  }

  getOutputExample(): Output {
    return {
      base: 'Bitcoin',
      quote: 'USD',
      value: 12345
    }
  }

  async read(): Promise<Output[]> {
    const base = this._base.toLowerCase()
    const quote = this._quote.toLowerCase()

    const result = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${base}&vs_currencies=${quote}`
    ).then((response) => response.json())

    const value = result[base][quote]

    return [{ base, quote, value }]
  }
}
