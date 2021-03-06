import { DB } from './DB'
import { GraphQL } from './GraphQL'
import { loadModule } from '../shared'
import { Source, Destination, Transformer } from '../interfaces'
import { JobConfig, Context, InterfaceConfig, RunConfig, RunType } from '../types'

const { log } = console

export class Job {
  private _config: RunConfig
  private _func: () => Promise<void>

  constructor(ctx: Context, config: JobConfig) {
    const singletons: Singletons = { db: ctx.db, graphql: ctx.graphql }
    const resolved = resolveJobConfig(config, singletons)
    const { source, destination, run } = resolved

    // Add the `Source` to the `Destination` if it's not a DB and the `Destination` is either DB or GraphQL
    if (!(source instanceof DB) && (destination instanceof DB || destination instanceof GraphQL)) {
      destination.add(source)
    }

    // Auto-generate a `Source`s GraphQL Schema for DB `Destination`s
    if (destination instanceof DB) {
      singletons.graphql.add(source)
    }

    this._config = run
    this._func = getFunction(resolved)
  }

  getConfig(): RunConfig {
    return this._config
  }

  getFunc(): () => Promise<void> {
    return this._func
  }
}

function getFunction(config: ResolvedConfig): () => Promise<void> {
  const { name, logs, source, destination, transformer } = config

  return async function func() {
    let processed = 0

    if (!transformer) {
      const data = await source.read()
      if (destination instanceof DB) {
        const args = { klass: source }
        processed = await destination.write(data, args)
      } else {
        processed = await destination.write(data)
      }
    } else {
      processed = await transformer.transform(source, destination)
    }

    if (logs && processed > 0) {
      log(`[${name}]: Processed ${processed} item(s)`)
    }
  }
}

function resolveJobConfig(config: JobConfig, singletons: Singletons): ResolvedConfig {
  const { name } = config
  const logs = config.logs || false

  const run = resolveRunConfig(config.run)

  const source = getInstance(resolveInterfaceConfig(config.source), singletons)
  const destination = getInstance(resolveInterfaceConfig(config.destination), singletons)
  let transformer
  if (config.transformer) {
    transformer = getInstance(resolveInterfaceConfig(config.transformer), singletons)
  }

  return {
    name,
    logs,
    run,
    source,
    destination,
    transformer
  }
}

function resolveInterfaceConfig(config: string | InterfaceConfig): InterfaceConfig {
  let name
  let args: unknown[] = []

  if (typeof config === 'string') {
    name = config
  } else {
    name = (config as InterfaceConfig).name
    args = (config as InterfaceConfig).args
  }

  return { name, args }
}

function resolveRunConfig(config: RunType | RunConfig): RunConfig {
  let type
  let args: unknown[] = []

  if (typeof config === 'string') {
    type = config
  } else {
    type = (config as RunConfig).type
    args = (config as RunConfig).args
  }

  return { type, args }
}

function getInstance(config: InterfaceConfig, singletons: Singletons) {
  if (config.name === 'DB') return singletons.db
  if (config.name === 'GraphQL') return singletons.graphql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return loadModule(config.name, config.args) as any
}

type Singletons = {
  db: DB
  graphql: GraphQL
}

type ResolvedConfig = {
  name: string
  logs: boolean
  run: RunConfig
  source: Source
  destination: Destination
  transformer?: Transformer
}
