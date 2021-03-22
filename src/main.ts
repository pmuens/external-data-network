import dotenv from 'dotenv'

import { DB } from './db'
import { Server } from './server'
import { GraphQL } from './graphql'
import { Scheduler } from './scheduler'
import { EdnOracle, EthereumEvents, CryptoCobras, EthereumSmartContract } from './registry'

dotenv.config()

declare const process: {
  env: {
    [key: string]: string
  }
}

const { CRYPTO_COBRAS_ADDRESS, ETHEREUM_RPC_URL, EDN_ORACLE_ADDRESS, SERVER_PORT } = process.env

const { log } = console

async function main() {
  // --- Registry ---
  // CryptoCobras
  const cobras = new CryptoCobras(CRYPTO_COBRAS_ADDRESS)
  // EdnOracle
  const oracle = new EdnOracle()
  // EthereumEvents
  const cobraEvents = new EthereumEvents(
    ETHEREUM_RPC_URL,
    CRYPTO_COBRAS_ADDRESS,
    'Birth(address,uint256,uint64,uint8)',
    0
  )
  const oracleEvents = new EthereumEvents(
    ETHEREUM_RPC_URL,
    EDN_ORACLE_ADDRESS,
    'DataRequest(address,uint256,string,bytes,string,bytes)',
    0
  )
  // EthereumSmartContract
  const oracleContract = new EthereumSmartContract()

  // --- Core ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new DB<any>()
  const server = new Server(parseInt(SERVER_PORT))
  const graphql = new GraphQL(server, db)
  const scheduler = new Scheduler()

  db.add(cobraEvents)
  db.add(oracleEvents)
  graphql.add(cobraEvents)
  graphql.add(oracleEvents)

  async function cobraEventWatcher() {
    const result = await cobraEvents.read()
    const processed = await db.write(cobraEvents, result)
    log(`"cobraEventWatcher" --> Indexed ${processed} new entries...`)
  }

  async function oracleEventWatcher() {
    const processed = await oracle.transform(oracleEvents, oracleContract)
    log(`"oracleEventWatcher" --> Processed ${processed} new requests...`)
  }

  await cobras.transform(db, graphql)

  graphql.setup()

  scheduler.add(cobraEventWatcher, '*/5 * * * * *')
  scheduler.add(oracleEventWatcher, '*/5 * * * * *')
  await cobraEventWatcher()
  await oracleEventWatcher()

  scheduler.start()
  server.start()
}

main()
