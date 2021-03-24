import { Klass } from './types'

export interface Source<Output> extends Klass {
  read<T>(args?: T): Promise<Output[]>
  getOutputExample(): Output
}

export interface Destination<Input> extends Klass {
  write(data: Input[], source?: Source<Input>): Promise<number>
  getInputExample(): Input
}

export interface Transformer<Output, Input> extends Klass {
  transform(source: Source<Output>, destination: Destination<Input>): Promise<number>
}
