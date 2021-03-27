import { Source } from '../host'

export type Output = {
  value: number
}

export class SimpleRng implements Source {
  private _min: number
  private _max: number

  constructor(min: number, max: number) {
    this._min = min
    this._max = max
  }

  getOutputExample(): Output {
    return { value: 42 }
  }

  async read(): Promise<Output[]> {
    const min = this._min
    const max = this._max

    return [
      {
        value: Math.floor(Math.random() * (max - min + 1) + min)
      }
    ]
  }
}
