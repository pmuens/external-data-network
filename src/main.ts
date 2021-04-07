import dotenv from 'dotenv'

import { DB, Server, GraphQL, Scheduler, Manager, Networking } from './classes'

dotenv.config()

process.on('unhandledRejection', function (err) {
  // eslint-disable-next-line no-console
  console.log(err)
})

const { HOST, P2P_PORT, SERVER_PORT, P2P_BOOTSTRAP_MULTIADDR } = process.env

async function main() {
  const host = HOST as string
  const p2p_port = parseInt(P2P_PORT as string)
  const server_port = parseInt(SERVER_PORT as string)
  const p2p_bootstrap_multiaddr = P2P_BOOTSTRAP_MULTIADDR as string

  const db = new DB()
  const server = new Server(server_port)
  const graphql = new GraphQL(server, db)
  const scheduler = new Scheduler()
  const manager = new Manager(scheduler, { db, graphql })
  const networking = new Networking(host, p2p_port, p2p_bootstrap_multiaddr)

  await networking.setup()
  await manager.setup()
  graphql.setup()

  await networking.start()
  scheduler.start()
  server.start()
}

main()
