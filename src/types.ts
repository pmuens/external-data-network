import { DB } from './db'
import { GraphQL } from './graphql'

export type Klass = {
  name: string
}

export type Singletons = {
  db: DB<unknown>
  graphql: GraphQL
}

export type JobConfig = {
  name: string
  run: RunType | RunConfig
  source: string | InterfaceConfig
  sink: string | InterfaceConfig
  transformer?: string | InterfaceConfig
  logs?: boolean
}

export type RunConfig = {
  type: RunType
  args: unknown[]
}

export type InterfaceConfig = {
  name: string
  args: unknown[]
}

export type RunType = 'schedule' | 'startup'
