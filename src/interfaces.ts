import { Input, Output } from './types'

export interface Source {
  read<T>(args?: T): Promise<Output[]>
  getOutputExample(): Output
}

export interface Destination {
  write<T>(data: Input[], args?: T): Promise<number>
  getInputExample(): Input
}

export interface Transformer {
  transform(source: Source, destination: Destination): Promise<number>
}
