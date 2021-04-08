import { Context } from './types'
import { DB, Server, GraphQL, Scheduler, Manager, Networking } from './classes'

process.on('unhandledRejection', function (err) {
  // eslint-disable-next-line no-console
  console.log(err)
})

async function main() {
  const db = new DB()
  const server = new Server()
  const scheduler = new Scheduler()
  const graphql = new GraphQL(server, db)

  const ctx: Context = { db, server, graphql, scheduler }

  const manager = new Manager(ctx)
  const networking = new Networking(ctx)

  await networking.setup()
  await manager.setup()
  graphql.setup()

  await networking.start()
  scheduler.start()
  server.start()
}

main()
