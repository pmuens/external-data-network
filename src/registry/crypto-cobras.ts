import { Transformer, DBOutput, DB, GraphQL, GraphQLInput } from '../host'
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
      type CryptoCobras {
        owner: String
        id: String
        rarity: Int
        genes: Int
      }

      input CryptoCobrasOrderBy {
        owner: CryptoCobrasSort
        id: CryptoCobrasSort
        rarity: CryptoCobrasSort
        genes: CryptoCobrasSort
      }

      enum CryptoCobrasSort {
        asc
        desc
      }

      type Query {
        cryptoCobras(id: String, orderBy: CryptoCobrasOrderBy, limit: Int!): [CryptoCobras]
      }
    `

    const resolvers = {
      Query: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cryptoCobras: async (_: unknown, args: any) => {
          const klass = EthereumEvents
          const filters = { address: this._address }
          const limit = args.limit
          let orderBy = args.orderBy

          // Map ordering to underlying `EthereumEvents` storage layout
          if (orderBy && Object.keys(orderBy).length) {
            const key = Object.keys(orderBy)[0]
            const sort = orderBy[key]
            if (key === 'owner') {
              orderBy = {
                'arguments[0]': sort
              }
            } else if (key === 'id') {
              orderBy = {
                'arguments[1]': sort
              }
            } else if (key === 'rarity') {
              orderBy = {
                'arguments[2]': sort
              }
            } else if (key === 'genes') {
              orderBy = {
                'arguments[3]': sort
              }
            }
          }

          const cobras = await db.read({ klass, filters, limit, orderBy })
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

    await graphql.write(data)

    transformed++
    return transformed
  }
}
