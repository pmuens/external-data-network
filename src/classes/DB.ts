import dotenv from 'dotenv'
import Database, { Database as BetterSqlite3 } from 'better-sqlite3'

import { toSnakeCase } from '../shared'
import { Source, Destination } from '../interfaces'
import { Klass } from '../types'

dotenv.config()

const { DB_FILE_PATH } = process.env

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Input = { [key: string]: any }
export type Output<T> = T

export class DB<T> implements Source<Output<T>>, Destination<Input> {
  private _db: BetterSqlite3

  name = DB.name

  constructor(filePath: string = DB_FILE_PATH as string) {
    this._db = new Database(filePath)
  }

  getInputExample(): Input {
    return {
      arbitrary: 'value'
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOutputExample(): Output<any> {
    return {
      arbitrary: 'value'
    }
  }

  async read<A>(args: A & Args): Promise<Output<T>[]> {
    const { klass, limit, orderBy } = args
    const filters = removeReservedKeys(args.filters)

    const values = []
    const name = getTableName(klass)

    let SQL = `SELECT json(data) AS data FROM ${name}`

    // Apply filters
    if (filters && Object.keys(filters).length) {
      SQL += ' WHERE '
      const clauses = []
      for (const [key, value] of Object.entries(filters)) {
        clauses.push(`json_extract(data, '$.${key}') = ?`)
        values.push(value)
      }
      SQL += clauses.join(' AND ')
    }

    // Apply ordering
    if (orderBy && Object.keys(orderBy).length) {
      const key = Object.keys(orderBy)[0]
      let sort = 'ASC'
      if (orderBy[key].toLocaleLowerCase() === 'desc') {
        sort = 'DESC'
      }
      SQL += ` ORDER BY json_extract(data, '$.${key}') ${sort}`
    }

    SQL += ' LIMIT ?;'
    values.push(limit)

    const SELECT_SQL = this._db.prepare(SQL)
    const result = SELECT_SQL.all(values)
    const data = result.map((item) => JSON.parse(item.data))

    return Promise.resolve(data)
  }

  async write(data: Input[], source: Source<Input>): Promise<number> {
    const name = getTableName(source)

    const INSERT_SQL = this._db.prepare(`INSERT INTO ${name} (data) VALUES (json(?));`)

    let inserted = 0
    this._db.transaction((data: Input[]) => {
      for (const item of data) {
        const { changes } = INSERT_SQL.run([JSON.stringify(item)])
        if (changes > 0) inserted++
      }
    })(data)

    return Promise.resolve(inserted)
  }

  add(source: Source<unknown>): void {
    const name = getTableName(source)
    const keys = getOutputKeys(source)

    const CREATE_TABLE_SQL = `
      CREATE TABLE IF NOT EXISTS ${name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE (data) ON CONFLICT IGNORE
      );
    `

    const CREATE_INDEXES_SQL = keys.reduce(
      (accum, key) =>
        (accum += `CREATE INDEX IF NOT EXISTS idx_${key} ON ${name}(json_extract(data, '$.${key}'));`),
      ''
    )

    this._db.transaction(() => {
      this._db.exec(CREATE_TABLE_SQL)
      this._db.exec(CREATE_INDEXES_SQL)
    })()
  }
}

function removeReservedKeys(filters: Filters): Filters {
  const reserved = ['limit', 'orderBy', 'order_by']

  for (const key of Object.keys(filters)) {
    if (reserved.includes(key)) delete filters[key]
  }

  return filters
}

function getOutputKeys<T>(source: Source<T>): string[] {
  const example = source.getOutputExample()

  const result = []
  for (const [key, value] of Object.entries(example)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result.push(key)
    }
  }

  return result
}

function getTableName(klass: Klass): string {
  return toSnakeCase(klass.name)
}

type Args = {
  klass: Klass
  filters: Filters
  limit: number
  orderBy?: OrderBy
}

type Filters = { [key: string]: string | number }

type OrderBy = { [key: string]: 'ASC' | 'asc' | 'DESC' | 'desc' }