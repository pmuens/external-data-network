import dotenv from 'dotenv'

import { DB } from './db'
import { Server } from './server'
import { GraphQL } from './graphql'
import { Scheduler } from './scheduler'
import { EthereumEvents, CryptoCobras } from './registry'

dotenv.config()

const { ETHEREUM_URL, ETHEREUM_PORT, CRYPTO_COBRAS_ADDRESS, SERVER_PORT } = process.env

const { log } = console

async function main() {
  const address = CRYPTO_COBRAS_ADDRESS as string
  const signature = 'Birth(address,uint256,uint256,uint256,uint8,uint8)'
  const ethereumNodeUrl = `${ETHEREUM_URL}:${ETHEREUM_PORT}`
  const serverPort = parseInt(SERVER_PORT as string)

  // --- Registry ---
  // EthereumEvents
  const ethereum = new EthereumEvents(ethereumNodeUrl, address, signature)
  // CryptoCobras
  const cobras = new CryptoCobras(address)

  // --- Core ---
  const db = new DB()
  const server = new Server(serverPort)
  const graphql = new GraphQL(server, db)
  const scheduler = new Scheduler()

  async function reindex() {
    log('Fetching new data...')
    const result = await ethereum.read()
    const indexed = await db.write(ethereum, result)
    log(`Indexed ${indexed} new entries...`)
  }

  await cobras.transform(db, graphql)

  graphql.add(ethereum)
  graphql.setup()

  scheduler.add(reindex, '* * * * *')
  await reindex()

  scheduler.start()
  server.start()
}

main()
