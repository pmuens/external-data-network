import { GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { DBSource, GraphQLSink, GraphQLFieldConfig } from '../host'
import { EthereumEvents } from '.'

export class CryptoCobras implements GraphQLSink {
  private _address: string

  constructor(address: string) {
    this._address = address
  }

  getFieldConfigs(db: DBSource): GraphQLFieldConfig[] {
    const type = new GraphQLObjectType({
      name: 'CryptoCobra',
      fields: {
        id: { type: GraphQLString },
        matronId: { type: GraphQLString },
        sireId: { type: GraphQLString },
        rarity: { type: GraphQLInt },
        genes: { type: GraphQLInt }
      }
    })
    const args = {
      id: { type: GraphQLString }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolve = (_: unknown, args: any) => {
      const cobras = db.find(EthereumEvents, { address: this._address })
      let result = cobras.map((item) => ({
        id: item.arguments[1],
        matronId: item.arguments[2],
        sireId: item.arguments[3],
        rarity: item.arguments[4],
        genes: item.arguments[5]
      }))
      if (args.id) {
        result = result.filter((item) => item.id === args.id)
      }
      return result
    }

    return [
      {
        name: 'cryptoCobras',
        type: new GraphQLList(type),
        args,
        resolve
      }
    ]
  }
}
