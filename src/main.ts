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
  const ethereumNodeUrl = `${ETHEREUM_URL}:${ETHEREUM_PORT}`
  const serverPort = parseInt(SERVER_PORT as string)

  // EthereumEvents
  const ethereum = new EthereumEvents(ethereumNodeUrl)

  // CryptoCobras
  const address = CRYPTO_COBRAS_ADDRESS as string
  const event = 'event Birth(address,uint256,uint256,uint256,uint8,uint8)'
  const cobras = new CryptoCobras(address)

  // DB
  const db = new DB()
  db.add(EthereumEvents)

  async function reindex() {
    log('Fetching new data...')
    const data = await ethereum.fetch(address, event, {
      fromBlock: 0,
      toBlock: 'latest'
    })
    const num = db.insert(EthereumEvents, data)
    log(`Indexed ${num} new entries...`)
  }

  // Server
  const server = new Server(serverPort)

  // GraphQL
  const graphql = new GraphQL(server, db)
  graphql.add(EthereumEvents)
  graphql.add(cobras)
  graphql.setup()

  // Scheduler
  const scheduler = new Scheduler()
  scheduler.add(reindex, '* * * * *')

  scheduler.start()
  server.start()
}

main()
