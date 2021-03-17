import { DataType, Klass } from './types'

export interface Source extends Klass {
  read<A, B>(args?: A): Promise<B[]>
}

export interface Sink extends Klass {
  write<T>(origin: Source | Transformer, data: T[]): Promise<number>
}

export interface Transformer extends Klass {
  transform(source: Source, sink: Sink): Promise<number>
}

export interface Producer extends Klass {
  getDataType(): DataType
}
