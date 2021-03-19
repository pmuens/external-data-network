import { OutputTypeDef } from '../host/types'
import { Source } from '../host/interfaces'

// NOTE: Keep these in sync
const OutputType: OutputTypeDef = {
  value: 'number'
}
export type Output = {
  value: number
}

export class SimpleRng implements Source<Output> {
  name = SimpleRng.name

  read<T>(args: T & Args): Promise<Output[]> {
    const { min, max } = args

    const output: Output[] = [
      {
        value: Math.floor(Math.random() * (max - min + 1) + min)
      }
    ]
    return Promise.resolve(output)
  }

  getOutputType(): OutputTypeDef {
    return OutputType
  }
}

type Args = {
  min: number
  max: number
}
