import { GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

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

    const type = new GraphQLObjectType({
      name: 'CryptoCobra',
      fields: {
        owner: { type: GraphQLString },
        id: { type: GraphQLString },
        rarity: { type: GraphQLInt },
        genes: { type: GraphQLInt }
      }
    })
    const args = {
      id: { type: GraphQLString }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolve = async (_: unknown, args: any) => {
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
    const fieldConfigs = [
      {
        name: 'cryptoCobras',
        type: new GraphQLList(type),
        args,
        resolve
      }
    ]

    graphql.write(CryptoCobras, fieldConfigs)

    transformed++
    return transformed
  }
}
