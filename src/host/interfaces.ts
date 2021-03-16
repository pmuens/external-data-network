/* eslint-disable @typescript-eslint/no-empty-interface */

import { GraphQLFieldConfig } from './utils'

interface Sink {}

interface GraphQLSink extends Sink {
  getFieldConfigs(): GraphQLFieldConfig[]
}

export { Sink, GraphQLSink }
