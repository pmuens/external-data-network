import { FieldConfig as GraphQLFieldConfig } from './graphql'
import { Klass, DBFilters } from './types'

// --- Sources ---
export interface DBSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  find<T extends Klass>(klass: T, filters: DBFilters): any[]
}

// --- Sinks ---
export interface GraphQLSink {
  getFieldConfigs(db: DBSource): GraphQLFieldConfig[]
}
