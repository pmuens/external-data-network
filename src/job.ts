import { DB } from './db'
import { GraphQL } from './graphql'
import { loadModule } from './shared'
import { Source, Sink, Transformer } from './interfaces'
import { JobConfig, Singletons, InterfaceConfig, RunConfig, RunType } from './types'

const { log } = console

export class Job {
  private _config: RunConfig
  private _func: () => Promise<void>

  constructor(config: JobConfig, singletons: Singletons) {
    const resolved = resolveJobConfig(config, singletons)
    const { source, sink, run } = resolved

    // Add the `Source` to the `Sink` if it's not a DB and the `Sink` is either DB or GraphQL
    if (!(source instanceof DB) && (sink instanceof DB || sink instanceof GraphQL)) {
      sink.add(source)
    }

    // Auto-generate a `Source`s GraphQL Schema for DB `Sink`s
    if (sink instanceof DB) {
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
  const { name, logs, source, sink, transformer } = config

  return async function func() {
    let processed = 0

    if (!transformer) {
      const data = await source.read()
      if (sink instanceof DB) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processed = await sink.write(data as any[], source as Source<any>)
      } else {
        processed = await sink.write(data)
      }
    } else {
      processed = await transformer.transform(source, sink)
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
  const sink = getInstance(resolveInterfaceConfig(config.sink), singletons)
  let transformer
  if (config.transformer) {
    transformer = getInstance(resolveInterfaceConfig(config.transformer), singletons)
  }

  return {
    name,
    logs,
    run,
    source,
    sink,
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

type ResolvedConfig = {
  name: string
  logs: boolean
  run: RunConfig
  source: Source<unknown>
  sink: Sink<unknown>
  transformer?: Transformer<unknown, unknown>
}
