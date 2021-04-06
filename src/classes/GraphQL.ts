import fetch from 'node-fetch'
import { Express } from 'express'
import { ApolloServer } from 'apollo-server-express'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { stitchSchemas } from '@graphql-tools/stitch'
import { introspectSchema } from '@graphql-tools/wrap'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { DocumentNode, GraphQLSchema, print } from 'graphql'
import { jsonToSchema } from '@walmartlabs/json-to-simple-graphql-schema'

import { DB } from './DB'
import { Server } from './Server'
import { toPascalCase, toCamelCase, getClassName } from '../shared'
import { Source, Destination } from '../interfaces'

export type Input = {
  types: string | DocumentNode | GraphQLSchema
  resolvers: Resolvers
}

export class GraphQL implements Destination {
  private _db: DB
  private _express: Express
  private _apollo: ApolloServer | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _subschemas: any[]

  constructor(server: Server, db: DB) {
    this._db = db
    this._express = server.express
    this._apollo = null
    this._subschemas = []
  }

  getInputExample(): Input {
    return {
      types: `
        type Query {
          name: String
        }
      `,
      resolvers: {
        Query: {
          name: () => 'John Doe'
        }
      }
    }
  }

  async write(data: Input[]): Promise<number> {
    let added = 0
    for (const item of data) {
      const { types, resolvers } = item
      const typeDefs = mergeTypeDefs([types])
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      this._subschemas.push({ schema })
      added++
    }
    return added
  }

  add(source: Source): void {
    const typeName = getTypeName(source)
    const fieldName = getFieldName(source)

    const sourceTypes = getTypes(source)

    const defaultParams = getDefaultParams()
    const sourceParams = getSourceParams(source)

    const params = [...defaultParams, ...sourceParams]

    const expanded = params.map((param) => `${param.name}: ${param.type}`).join(', ')
    const rootType = `
      type Query {
        ${fieldName}(${expanded}): [${typeName}]
      }
    `

    const resolvers = {
      Query: {
        [fieldName]: (_: unknown, args: ResolverArguments) => {
          const klass = source
          const filters = args
          const limit = args.limit
          return this._db.read({ klass, filters, limit })
        }
      }
    }

    const typeDefs = mergeTypeDefs([rootType, sourceTypes])
    const schema = makeExecutableSchema({ typeDefs, resolvers })
    this._subschemas.push({ schema })
  }

  async register(endpoint: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function executor(args: { [key: string]: any }) {
      const { document, variables } = args
      const query = print(document)
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      })
      return result.json()
    }

    // IMPORTANT: This MUST be `unshift` so that local `resolvers` always
    // have higher priority than remote `executors` with the same name!
    this._subschemas.unshift({
      schema: await introspectSchema(executor),
      executor
    })
  }

  setup(): void {
    // Default to the `Input` example if no types are given
    if (this._subschemas.length === 0) {
      const { types, resolvers } = this.getInputExample()
      const typeDefs = mergeTypeDefs([types])
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      this._subschemas.push({ schema })
    }

    const schema = stitchSchemas({ subschemas: this._subschemas })

    this._apollo = new ApolloServer({ schema })
    this._apollo.applyMiddleware({ app: this._express })
  }

  // Adaption of: https://github.com/apollographql/apollo-server/issues/1275#issuecomment-532183702
  async reload(): Promise<void> {
    const schema = stitchSchemas({ subschemas: this._subschemas })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const schemaDerivedData = await this._apollo.generateSchemaDerivedData(schema)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._apollo.schema = schema
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._apollo.schemaDerivedData = schemaDerivedData
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
function getFieldName(klass: Object): string {
  const name = getClassName(klass)
  return toCamelCase(name)
}

// eslint-disable-next-line @typescript-eslint/ban-types
function getTypeName(klass: Object): string {
  const name = getClassName(klass)
  return toPascalCase(name)
}

function getTypes(source: Source): string {
  const prefix = getTypeName(source)
  const example = source.getOutputExample()

  const { value } = jsonToSchema({ jsonInput: JSON.stringify(example) })

  // Matches patterns like `type FooBar {`
  const typeNameRegex = new RegExp('type ([A-Z]{1}.*)+\\s{', 'g')

  let matched
  let result = value
  while ((matched = typeNameRegex.exec(result))) {
    const oldTypeName = matched[1]

    let newTypeName = prefix + oldTypeName
    if (oldTypeName === 'AutogeneratedMainType') {
      newTypeName = prefix
    }

    const oldTypeNameRegex = new RegExp(`\\s${oldTypeName}\\s`, 'g')
    result = result.replace(oldTypeNameRegex, ` ${newTypeName} `)
  }

  return result
}

function getDefaultParams(): Parameter[] {
  const result: Parameter[] = []

  result.push({
    name: 'limit',
    type: 'Int!'
  })

  return result
}

function getSourceParams(source: Source): Parameter[] {
  const example = source.getOutputExample()

  const result: Parameter[] = []
  for (const [key, value] of Object.entries(example)) {
    if (typeof value === 'string') {
      result.push({
        name: key,
        type: 'String'
      })
    } else if (typeof value === 'number' && Number.isInteger(value)) {
      result.push({
        name: key,
        type: 'Int'
      })
    } else if (typeof value === 'number' && !Number.isInteger(value)) {
      result.push({
        name: key,
        type: 'Float'
      })
    } else if (typeof value === 'boolean') {
      result.push({
        name: key,
        type: 'Boolean'
      })
    }
  }

  return result
}

type Parameter = {
  name: string
  type: 'String' | 'String!' | 'Int' | 'Int!' | 'Float' | 'Float!' | 'Boolean' | 'Boolean!'
}

type ResolverArguments = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any
  limit: number
}

type Resolvers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
