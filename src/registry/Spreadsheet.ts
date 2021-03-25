import fs from 'fs'
import { resolve, join } from 'path'
import jsonexport from 'jsonexport'

import { Destination } from '../../src/host'

export type Input = {
  [key: string]: unknown
}

export class Spreadsheet implements Destination {
  private _path: string
  private _name: string

  constructor(path: string, name: string) {
    this._path = path
    this._name = name
  }

  getInputExample(): Input {
    return {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3'
    }
  }

  async write(data: Input[]): Promise<number> {
    const result = await jsonexport(data)

    const fileName = resolve(join(this._path, this._name))
    await fs.writeFileSync(fileName, result)

    return data.length
  }
}
