import { OutputTypeDef, Klass } from './types'

export interface Source<Output> extends Klass {
  read<T>(args?: T): Promise<Output[]>
  getOutputType(): OutputTypeDef
  getOutputExample(): Output
}

export interface Sink<Input> extends Klass {
  write(source: Source<Input>, data: Input[]): Promise<number>
}

export interface Transformer<Output, Input> extends Klass {
  transform(source: Source<Output>, sink: Sink<Input>): Promise<number>
}
