import dotenv from 'dotenv'

import { EthereumEvents } from './registry/ethereum-events'

dotenv.config()
const { log } = console

const { ETHEREUM_URL, ETHEREUM_PORT, ETHEREUM_TEST_ADDRESS, ETHEREUM_TEST_EVENT } = process.env

async function main() {
  const url = `${ETHEREUM_URL}:${ETHEREUM_PORT}`
  const address = ETHEREUM_TEST_ADDRESS as string
  const event = ETHEREUM_TEST_EVENT as string

  const ethereum = new EthereumEvents(url)

  const options = { fromBlock: 0, toBlock: 'latest' }
  const result = await ethereum.fetch(address, event, options)

  log(result)
}

main()
