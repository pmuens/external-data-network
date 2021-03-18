export type Klass = {
  name: string
}

export type OutputTypeDef = {
  [key: string]: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]' | 'unknown'
}
