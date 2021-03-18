export type Klass = {
  name: string
}

export type DataType = {
  [key: string]: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]' | 'unknown'
}
