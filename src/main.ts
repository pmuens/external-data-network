import dotenv from 'dotenv'

import { DB, Server, GraphQL, Scheduler, Manager } from './classes'

dotenv.config()

const { SERVER_PORT } = process.env

async function main() {
  const port = parseInt(SERVER_PORT as string)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new DB<any>()
  const server = new Server(port)
  const graphql = new GraphQL(server, db)
  const scheduler = new Scheduler()
  const manager = new Manager(scheduler, { db, graphql })

  await manager.setup()
  graphql.setup()

  scheduler.start()
  server.start()
}

main()
