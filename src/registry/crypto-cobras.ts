import { DBOutput, DB, GraphQL, GraphQLInput } from '../host/types'
import { Transformer } from '../host/interfaces'
import { EthereumEvents, Output as EEOutput } from './ethereum-events'

export class CryptoCobras implements Transformer<DBOutput<EEOutput>, GraphQLInput> {
  private _address: string

  name = CryptoCobras.name

  constructor(address: string) {
    this._address = address
  }

  async transform(db: DB<EEOutput>, graphql: GraphQL): Promise<number> {
    let transformed = 0

    const types = `
      type CryptoCobra {
        owner: String
        id: String
        rarity: Int
        genes: Int
      }

      type Query {
        cryptoCobras(id: String): [CryptoCobra]
      }
    `

    const resolvers = {
      Query: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cryptoCobras: async (_: unknown, args: any) => {
          const klass = EthereumEvents
          const filters = { address: this._address }

          const cobras = await db.read({ klass, filters })
          let result = cobras.map((item) => ({
            owner: item.arguments[0],
            id: item.arguments[1],
            rarity: item.arguments[2],
            genes: item.arguments[3]
          }))
          if (args.id) {
            result = result.filter((item) => item.id === args.id)
          }
          return result
        }
      }
    }

    const data = [{ types, resolvers }]

    graphql.write(data)

    transformed++
    return transformed
  }
}
