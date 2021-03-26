import fetch from 'node-fetch'

import { Source } from '../host'

export type Output = {
  endpoint: string
  round: number
  randomness: string
  signature: string
  previousSignature: string
}

export class Drand implements Source {
  private _endpoint: string

  constructor(endpoint: string) {
    this._endpoint = endpoint
  }

  getOutputExample(): Output {
    return {
      endpoint: 'api.drand.sh',
      round: 1,
      randomness: '101297f1ca7dc44ef6088d94ad5fb7ba03455dc33d53ddb412bbc4564ed986ec',
      signature:
        '8d61d9100567de44682506aea1a7a6fa6e5491cd27a0a0ed349ef6910ac5ac20ff7bc3e09d7c046566c9f7f3c6f3b10104990e7cb424998203d8f7de586fb7fa5f60045417a432684f85093b06ca91c769f0e7ca19268375e659c2a2352b4655',
      previousSignature: '176f93498eac9ca337150b46d21dd58673ea4e3581185f869672e59fa4cb390a'
    }
  }

  async read(): Promise<Output[]> {
    const endpoint = this._endpoint
    const result = await fetch(`https://${endpoint}/public/latest`).then((response) =>
      response.json()
    )

    const { round, randomness, signature } = result
    const previousSignature = result.previous_signature

    return [
      {
        endpoint,
        round,
        randomness,
        signature,
        previousSignature
      }
    ]
  }
}
