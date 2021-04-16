import fetch from 'node-fetch'
import { ApolloServer } from 'apollo-server-express'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { stitchSchemas } from '@graphql-tools/stitch'
import { introspectSchema } from '@graphql-tools/wrap'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { DocumentNode, GraphQLSchema, print } from 'graphql'
import { jsonToSchema } from '@walmartlabs/json-to-simple-graphql-schema'

import { DB } from './DB'
import { Server } from './Server'
import { Klass } from '../types'
import { Source, Destination } from '../interfaces'
import { toPascalCase, toCamelCase, getClassName, getRandomId } from '../shared'

export type Input = {
  types: string | DocumentNode | GraphQLSchema
  resolvers: Resolvers
}

export class GraphQL implements Destination {
  private _db: DB
  private _server: Server
  private _apollo: ApolloServer | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _subschemaMappings: { [key: string]: any }

  constructor(server: Server, db: DB) {
    this._db = db
    this._server = server
    this._apollo = null
    this._subschemaMappings = {}
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
      this._subschemaMappings[getSubschemaMappingKey()] = { schema }
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
    this._subschemaMappings[getSubschemaMappingKey()] = { schema }
  }

  async register(url: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function executor(args: { [key: string]: any }) {
      const { document, variables } = args
      const query = print(document)
      const result = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      })
      return result.json()
    }

    this._subschemaMappings[url] = {
      schema: await introspectSchema(executor),
      executor
    }

    return this.reload()
  }

  async deregister(url: string): Promise<void> {
    delete this._subschemaMappings[url]
    return this.reload()
  }

  setup(): void {
    // Default to the `Input` example if no types are given
    if (Object.keys(this._subschemaMappings).length === 0) {
      const { types, resolvers } = this.getInputExample()
      const typeDefs = mergeTypeDefs([types])
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      this._subschemaMappings[getSubschemaMappingKey()] = { schema }
    }

    const schema = this._generateSchema()

    this._apollo = new ApolloServer({ schema })
    this._apollo.applyMiddleware({ app: this._server.express })
  }

  // Adaption of: https://github.com/apollographql/apollo-server/issues/1275#issuecomment-532183702
  async reload(): Promise<void> {
    const schema = this._generateSchema()
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

  getUrl(address: string): string {
    // TODO: Make `port` optional
    // TODO: Make `protocol` and `path `configurable
    const protocol = 'http'
    const path = 'graphql'
    const port = this._server.port
    return `${protocol}://${address}:${port}/${path}`
  }

  private _generateSchema(): GraphQLSchema {
    const remoteSubschemas = []
    const localSubschemas = []

    for (const [key, value] of Object.entries(this._subschemaMappings)) {
      if (key.startsWith('http')) {
        remoteSubschemas.push(value)
      } else {
        localSubschemas.push(value)
      }
    }

    // IMPORTANT: The order in which we spread the arrays is important given that
    // duplicate entries at the end of the array will overwrite earlier entries
    // during the Schema Stitchings merge operation
    const subschemas = [...remoteSubschemas, ...localSubschemas]

    return stitchSchemas({ subschemas })
  }
}

function getFieldName(klass: Klass): string {
  const name = getClassName(klass)
  return toCamelCase(name)
}

function getTypeName(klass: Klass): string {
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

function getSubschemaMappingKey(): string {
  return `local${getRandomId()}`
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
