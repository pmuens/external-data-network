import { ApolloServer } from 'apollo-server-express'
import { Express } from 'express'
import { Server } from './server'
import { DB } from './db'
import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType
} from 'graphql'

import { Klass, Types, toPascalCase, toCamelCase } from './shared'

export class GraphQL {
  private _db: DB
  private _express: Express
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _fields: { [key: string]: any }

  constructor(server: Server, db: DB) {
    this._db = db
    this._express = server.express
    this._fields = {}
  }

  add(klass: Klass): void {
    const name = getFieldName(klass)
    const mappings = getTypeMappings(klass.types)
    const type = getType(klass, mappings)
    const args = getArgs(mappings)

    this._fields[name] = {
      type: new GraphQLList(type),
      args,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: async (_: any, args: any) => this._db.find(klass, args)
    }
  }

  setup(): void {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: this._fields
      })
    })

    const server = new ApolloServer({ schema })
    server.applyMiddleware({ app: this._express })
  }
}

function getFieldName(klass: Klass): string {
  return toCamelCase(klass.name)
}

function getTypeName(klass: Klass): string {
  return toPascalCase(klass.name)
}

function getTypeMappings(types: Types): TypeMapping[] {
  const result: TypeMapping[] = []
  for (const [key, value] of Object.entries(types)) {
    const typeName = toCamelCase(key)
    if (value === 'string') {
      result.push({
        key,
        typeName,
        typeValue: GraphQLString
      })
    } else if (value === 'number') {
      result.push({
        key,
        typeName,
        typeValue: GraphQLInt
      })
    } else if (value === 'boolean') {
      result.push({
        key,
        typeName,
        typeValue: GraphQLBoolean
      })
    } else if (value.includes('[]')) {
      if (value.startsWith('string')) {
        result.push({
          key,
          typeName,
          typeValue: new GraphQLList(GraphQLString)
        })
      } else if (value.startsWith('number')) {
        result.push({
          key,
          typeName,
          typeValue: new GraphQLList(GraphQLInt)
        })
      } else if (value.startsWith('boolean')) {
        result.push({
          key,
          typeName,
          typeValue: new GraphQLList(GraphQLBoolean)
        })
      }
    }
  }
  return result
}

function getType(klass: Klass, mappings: TypeMapping[]) {
  const name = getTypeName(klass)
  const fields = mappings.reduce((accum, item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(accum as { [key: string]: any })[item.typeName] = {
      type: item.typeValue
    }
    return accum
  }, {})
  return new GraphQLObjectType({ name, fields })
}

function getArgs(mappings: TypeMapping[]) {
  return mappings.reduce((accum, item) => {
    if (!(item.typeValue instanceof GraphQLList)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(accum as { [key: string]: any })[item.typeName] = {
        type: item.typeValue
      }
    }
    return accum
  }, {})
}

type TypeMapping = {
  key: string
  typeName: string
  typeValue: GraphQLType
}
