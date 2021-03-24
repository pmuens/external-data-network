import { DB, GraphQL } from './classes'

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
  destination: string | InterfaceConfig
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
