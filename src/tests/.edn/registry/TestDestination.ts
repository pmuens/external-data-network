import fs from 'fs-extra'
import { resolve, join } from 'path'

import { Destination } from '../../../host'

export type Input = {
  [key: string]: unknown
}

export class TestDestination implements Destination {
  private _path: string
  private _name: string

  constructor(path: string, name: string) {
    this._path = path
    this._name = name
  }

  getInputExample(): Input {
    return {
      key1: 'value',
      key2: 42,
      key3: false
    }
  }

  async write(data: Input[]): Promise<number> {
    const fileName = resolve(join(this._path, this._name))
    await fs.writeJSON(fileName, data)
    return data.length
  }
}
