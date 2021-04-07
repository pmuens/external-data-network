import dotenv from 'dotenv'

import { Context } from './types'
import { DB, Server, GraphQL, Scheduler, Manager, Networking } from './classes'

dotenv.config()

process.on('unhandledRejection', function (err) {
  // eslint-disable-next-line no-console
  console.log(err)
})

const { HOST, P2P_PORT, SERVER_PORT, P2P_BOOTSTRAP_MULTIADDR } = process.env

async function main() {
  const host = HOST as string
  const p2pPort = parseInt(P2P_PORT as string)
  const serverPort = parseInt(SERVER_PORT as string)
  const bootstrapMultiaddr = P2P_BOOTSTRAP_MULTIADDR as string

  const db = new DB()
  const server = new Server(serverPort)
  const graphql = new GraphQL(server, db)

  const ctx: Context = { db, server, graphql }

  const scheduler = new Scheduler()
  const manager = new Manager(ctx, scheduler)
  const networking = new Networking(ctx, host, p2pPort, bootstrapMultiaddr)

  await networking.setup()
  await manager.setup()
  graphql.setup()

  await networking.start()
  scheduler.start()
  server.start()
}

main()
