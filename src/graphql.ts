import { ApolloServer } from 'apollo-server-express'
import { Express } from 'express'
import { Server } from './server'
import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType
} from 'graphql'

import { Klass, Types, DBFilters } from './types'
import { DBSource, GraphQLSink } from './interfaces'
import { toPascalCase, toCamelCase, isKlass } from './shared'

export class GraphQL {
  private _db: DBSource
  private _express: Express
  private _fieldConfigs: FieldConfig[]

  constructor(server: Server, db: DBSource) {
    this._db = db
    this._express = server.express
    this._fieldConfigs = []
  }

  add<A extends Klass | GraphQLSink>(input: A): void {
    // `Klass` support
    if (isKlass(input)) {
      const klass = input
      const name = getFieldName(klass)
      const mappings = getTypeMappings(klass.types)
      const type = getType(klass, mappings)
      const args = getArgs(mappings)

      this._fieldConfigs.push({
        name,
        type: new GraphQLList(type),
        args,
        resolve: (_, args) => this._db.find(klass, args as DBFilters)
      })
      return
    }
    // `GraphQLSink` support
    const sink = input as GraphQLSink
    const fieldConfigs = sink.getFieldConfigs(this._db)
    fieldConfigs.forEach((config) => this._fieldConfigs.push(config))
  }

  setup(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = getFieldConfigMap(this._fieldConfigs) as any
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields
      })
    })

    const server = new ApolloServer({ schema })
    server.applyMiddleware({ app: this._express })
  }
}

export type FieldConfig = {
  type: GraphQLType
  name?: string
  args?: unknown
  resolve?: (
    source: unknown,
    args: unknown,
    context: unknown,
    info: unknown
  ) => Promise<unknown> | unknown
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

function getFieldConfigMap(fields: FieldConfig[]): FieldConfigMap {
  return fields.reduce((accum: FieldConfigMap, item) => {
    const { type, args, resolve } = item as FieldConfig
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    accum[item.name!] = {
      type,
      args,
      resolve
    }
    return accum
  }, {})
}

function getType(klass: Klass, mappings: TypeMapping[]): GraphQLObjectType {
  const name = getTypeName(klass)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: any = mappings.reduce((accum: FieldConfigMap, item) => {
    accum[item.typeName] = {
      type: item.typeValue
    }
    return accum
  }, {})
  return new GraphQLObjectType({ name, fields })
}

function getArgs(mappings: TypeMapping[]): FieldConfigMap {
  return mappings.reduce((accum: FieldConfigMap, item) => {
    if (!(item.typeValue instanceof GraphQLList)) {
      accum[item.typeName] = {
        type: item.typeValue
      }
    }
    return accum
  }, {})
}

type FieldConfigMap = {
  [key: string]: FieldConfig
}

type TypeMapping = {
  key: string
  typeName: string
  typeValue: GraphQLType
}
