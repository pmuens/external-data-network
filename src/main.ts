import { join } from 'path'
import dotenv from 'dotenv'

import { DB } from './db'
import { Server } from './server'
import { GraphQL } from './graphql'
import { Scheduler } from './scheduler'
import { EthereumEvents } from './registry/ethereum-events'

dotenv.config()

const {
  DB_FILE_PATH,
  DB_FILE_NAME,
  ETHEREUM_URL,
  ETHEREUM_PORT,
  ETHEREUM_TEST_ADDRESS,
  ETHEREUM_TEST_EVENT,
  SERVER_PORT
} = process.env

const { log } = console

async function main() {
  const ethereumNodeUrl = `${ETHEREUM_URL}:${ETHEREUM_PORT}`
  const ethereumAddress = ETHEREUM_TEST_ADDRESS as string
  const ethereumEvent = ETHEREUM_TEST_EVENT as string
  const dbFilePath = join(DB_FILE_PATH as string, DB_FILE_NAME as string)
  const serverPort = parseInt(SERVER_PORT as string)

  // EthereumEvents
  const ethereum = new EthereumEvents(ethereumNodeUrl)

  // DB
  const db = new DB(dbFilePath)
  db.add(EthereumEvents)

  async function reindex() {
    log('Fetching new data...')
    const data = await ethereum.fetch(ethereumAddress, ethereumEvent, {
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
  graphql.setup()

  // Scheduler
  const scheduler = new Scheduler()
  scheduler.add(reindex, '* * * * *')

  scheduler.start()
  server.start()
}

main()
