import { join } from 'path'
import dotenv from 'dotenv'

import { DB } from './db'
import { EthereumEvents } from './registry/ethereum-events'

dotenv.config()
const { log } = console

const {
  DB_FILE_PATH,
  DB_FILE_NAME,
  ETHEREUM_URL,
  ETHEREUM_PORT,
  ETHEREUM_TEST_ADDRESS,
  ETHEREUM_TEST_EVENT
} = process.env

async function main() {
  const url = `${ETHEREUM_URL}:${ETHEREUM_PORT}`
  const address = ETHEREUM_TEST_ADDRESS as string
  const event = ETHEREUM_TEST_EVENT as string
  const dbFilePath = join(DB_FILE_PATH as string, DB_FILE_NAME as string)

  const db = new DB(dbFilePath)
  const ethereum = new EthereumEvents(url)

  const data = await ethereum.fetch(address, event, { fromBlock: 0, toBlock: 'latest' })

  db.setup(EthereumEvents)
  db.insert(EthereumEvents, data)
  const result = db.find(EthereumEvents, { address, id: 1 })

  log(result)
}

main()
