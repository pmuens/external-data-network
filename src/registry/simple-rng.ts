import { Source } from '../host/interfaces'

export type Output = {
  value: number
}

export class SimpleRng implements Source<Output> {
  name = SimpleRng.name

  getOutputExample(): Output {
    return { value: 42 }
  }

  async read<T>(args: T & Args): Promise<Output[]> {
    const { min, max } = args

    const output: Output[] = [
      {
        value: Math.floor(Math.random() * (max - min + 1) + min)
      }
    ]
    return Promise.resolve(output)
  }
}

type Args = {
  min: number
  max: number
}
