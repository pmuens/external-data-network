import { Klass, Input, Output } from './types'

export interface Source extends Klass {
  read<T>(args?: T): Promise<Output[]>
  getOutputExample(): Output
}

export interface Destination extends Klass {
  write(data: Input[], source?: Source): Promise<number>
  getInputExample(): Input
}

export interface Transformer extends Klass {
  transform(source: Source, destination: Destination): Promise<number>
}
