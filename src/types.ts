import { DB, Server, GraphQL, Scheduler } from './classes'

// eslint-disable-next-line @typescript-eslint/ban-types
export type Klass = Object

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Input = { [key: string]: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Output = { [key: string]: any }

export type Context = {
  db: DB
  server: Server
  graphql: GraphQL
  scheduler: Scheduler
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
