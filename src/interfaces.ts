import { Klass } from './types'

export interface Source<Output> extends Klass {
  read<T>(args?: T): Promise<Output[]>
  getOutputExample(): Output
}

export interface Sink<Input> extends Klass {
  write(data: Input[], source?: Source<Input>): Promise<number>
  getInputExample(): Input
}

export interface Transformer<Output, Input> extends Klass {
  transform(source: Source<Output>, sink: Sink<Input>): Promise<number>
}
