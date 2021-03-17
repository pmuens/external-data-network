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

import { DB } from './db'
import { DataType } from './types'
import { toPascalCase, toCamelCase } from './shared'
import { Source, Sink, Transformer, Producer } from './interfaces'

export class GraphQL implements Sink {
  private _db: DB
  private _express: Express
  private _fieldConfigs: FieldConfig[]

  name = GraphQL.name

  constructor(server: Server, db: DB) {
    this._db = db
    this._express = server.express
    this._fieldConfigs = []
  }

  async write<T>(_: Source | Transformer, data: T[]): Promise<number> {
    const fieldConfigs = (data as unknown) as FieldConfig[]
    let added = 0
    for (const config of fieldConfigs) {
      this._fieldConfigs.push(config)
      added++
    }
    return added
  }

  add(source: Source & Producer): void {
    const name = getFieldName(source)
    const mappings = getTypeMappings(source.getDataType())
    const type = getType(source, mappings)
    const args = getArgs(mappings)

    this._fieldConfigs.push({
      name,
      type: new GraphQLList(type),
      args,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (_, args) => this._db.read({ klass: source, filters: args as any })
    })
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

type FieldConfig = {
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

function getFieldName(source: Source): string {
  return toCamelCase(source.name)
}

function getTypeName(source: Source): string {
  return toPascalCase(source.name)
}

function getTypeMappings(type: DataType): TypeMapping[] {
  const result: TypeMapping[] = []
  for (const [key, value] of Object.entries(type)) {
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

function getType(source: Source, mappings: TypeMapping[]): GraphQLObjectType {
  const name = getTypeName(source)
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
