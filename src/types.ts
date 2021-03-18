export type Klass = {
  name: string
}

export type OutputTypeDef =
  | {
      [key: string]: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]'
    }
  | 'unknown' // NOTE: The `unknown` type acts as an escape hatch and will be ignored by the core
