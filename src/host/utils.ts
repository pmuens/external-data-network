import { FieldConfig as GraphQLFieldConfig } from '../graphql'
import { DB, Filters } from '../db'
import { Klass } from '../shared'

// TODO: Refactor to use a Singleton
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function find(klass: Klass, filters: Filters): any[] {
  const db = new DB()
  return db.find(klass, filters)
}

const db = {
  find
}

export { GraphQLFieldConfig, db }
