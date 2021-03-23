import dotenv from 'dotenv'

import { DB } from './db'
import { Server } from './server'
import { GraphQL } from './graphql'
import { Job, Config as JobConfig } from './job'
import { Scheduler } from './scheduler'

dotenv.config()

declare const process: {
  env: {
    [key: string]: string
  }
}

const { CRYPTO_COBRAS_ADDRESS, ETHEREUM_RPC_URL, EDN_ORACLE_ADDRESS, SERVER_PORT } = process.env

const configs: JobConfig[] = [
  {
    name: 'CobrasBirthEventIndexer',
    logs: true,
    run: {
      type: 'schedule',
      args: ['*/5 * * * * *']
    },
    source: {
      name: 'EthereumEvents',
      args: [ETHEREUM_RPC_URL, CRYPTO_COBRAS_ADDRESS, 'Birth(address,uint256,uint64,uint8)', 0]
    },
    sink: 'DB'
  },
  {
    name: 'OracleDataRequestProcessor',
    logs: true,
    run: {
      type: 'schedule',
      args: ['*/5 * * * * *']
    },
    source: {
      name: 'EthereumEvents',
      args: [
        ETHEREUM_RPC_URL,
        EDN_ORACLE_ADDRESS,
        'DataRequest(address,uint256,string,bytes,string,bytes)',
        0
      ]
    },
    sink: 'EthereumSmartContract',
    transformer: 'EdnOracle'
  },
  {
    name: 'CryptoCobrasTransformer',
    logs: false,
    run: 'startup',
    source: 'DB',
    sink: 'GraphQL',
    transformer: {
      name: 'CryptoCobras',
      args: [CRYPTO_COBRAS_ADDRESS]
    }
  }
]

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new DB<any>()
  const server = new Server(parseInt(SERVER_PORT))
  const graphql = new GraphQL(server, db)
  const scheduler = new Scheduler()
  const singletons = { db, graphql }

  for (const config of configs) {
    const job = new Job(config, singletons)

    const func = job.getFunc()
    const { type, args } = job.getConfig()

    if (type === 'startup') {
      await func()
    } else if (type === 'schedule') {
      scheduler.add(func, args[0] as string)
    }
  }

  graphql.setup()

  scheduler.start()
  server.start()
}

main()
