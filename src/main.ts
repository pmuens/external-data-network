import dotenv from 'dotenv'

import { DB, Server, GraphQL, Scheduler, Manager } from './classes'

dotenv.config()

const { SERVER_PORT } = process.env

async function main() {
  const port = parseInt(SERVER_PORT as string)

  const db = new DB()
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
