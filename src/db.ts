import dotenv from 'dotenv'
import Database, { Database as BetterSqlite3 } from 'better-sqlite3'

import { toSnakeCase } from './shared'
import { Source, Sink } from './interfaces'
import { Klass, OutputTypeDef } from './types'

dotenv.config()

const { DB_FILE_PATH } = process.env

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Input = any
// NOTE: Keep these in sync
const OutputType: OutputTypeDef = {
  unknown: 'unknown'
}
export type Output = {
  unknown: unknown
}

export class DB implements Source<Output>, Sink<Input> {
  private _db: BetterSqlite3

  name = DB.name

  constructor(filePath: string = DB_FILE_PATH as string) {
    this._db = new Database(filePath)
  }

  // The `DB` as a `Source` is a special case since
  // the real `OutputTypeDef` varies during runtime
  // as we're able to query arbitrary data.
  getOutputType(): OutputTypeDef {
    return OutputType
  }

  async read<T>(args: T & Args): Promise<Output[]> {
    const { klass, filters } = args
    return Promise.resolve(this._find(klass, filters))
  }

  async write(source: Source<Input>, data: Input[]): Promise<number> {
    this._ensureTable(source)
    const inserted = this._insert(source, data)
    return Promise.resolve(inserted)
  }

  private _insert(source: Source<Input>, data: Input[]): number {
    const name = getTableName(source)
    const mappings = getColumnMappings(source.getOutputType())

    const columnNames = mappings.map((item) => item.columnName).join(',')
    const placeholders = mappings.map(() => '?').join(',')
    const INSERT_SQL = this._db.prepare(
      `INSERT INTO ${name} (${columnNames}) VALUES (${placeholders});`
    )

    let inserted = 0
    this._db.transaction((data: Input[]) => {
      data = stringifyObjects(data)
      for (const item of data) {
        const values = Object.values(item)
        const { changes } = INSERT_SQL.run(values)
        if (changes > 0) inserted++
      }
    })(data)

    return inserted
  }

  private _find(klass: Klass, filters: Filters): Output[] {
    const values = []
    const name = getTableName(klass)
    let SQL = `SELECT * FROM ${name}`

    if (filters && Object.keys(filters).length) {
      SQL += ' WHERE '
      const clauses = []
      for (const [key, value] of Object.entries(filters)) {
        clauses.push(`${getColumnName(key)} = ?`)
        values.push(value)
      }
      SQL += clauses.join(' AND ')
    }

    SQL += ';'
    const SELECT_SQL = this._db.prepare(SQL)
    const result = SELECT_SQL.all(values)
    return parseObjects(result)
  }

  private _ensureTable(source: Source<Input>) {
    const name = getTableName(source)
    const mappings = getColumnMappings(source.getOutputType())

    const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${name} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${mappings.map((item) => `${item.columnName} ${item.columnSql}`).join(',')},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(${mappings.map((item) => item.columnName).join(',')}) ON CONFLICT IGNORE
    );`

    const CREATE_INDEXES_SQL = mappings.reduce((accum, item) => {
      if (item.isIndexed) {
        return (accum += `CREATE INDEX IF NOT EXISTS idx_${item.columnName} ON ${name}(${item.columnName});`)
      }
      return accum
    }, '')

    this._db.transaction(() => {
      this._db.exec(CREATE_TABLE_SQL)
      this._db.exec(CREATE_INDEXES_SQL)
    })()
  }
}

function getTableName(klass: Klass): string {
  return toSnakeCase(klass.name)
}

function getColumnName(key: string): string {
  return toSnakeCase(key)
}

function getColumnMappings(type: OutputTypeDef): ColumnMapping[] {
  const result: ColumnMapping[] = []
  for (const [key, value] of Object.entries(type)) {
    const columnName = getColumnName(key)
    if (value === 'string') {
      result.push({
        key,
        columnName,
        columnSql: 'VARCHAR(255) NOT NULL',
        isIndexed: true
      })
    } else if (value === 'number') {
      result.push({
        key,
        columnName,
        columnSql: 'INTEGER NOT NULL',
        isIndexed: false
      })
    } else if (value === 'boolean') {
      result.push({
        key,
        columnName,
        columnSql: 'BOOLEAN NOT NULL',
        isIndexed: false
      })
    } else if (value.includes('[]')) {
      result.push({
        key,
        columnName,
        columnSql: 'TEXT NOT NULL',
        isIndexed: false
      })
    }
  }
  return result
}

function stringifyObjects<T>(data: T[]): T[] {
  for (const item of data) {
    for (const [key, value] of Object.entries(item)) {
      let processedValue = value
      if (typeof value === 'object') {
        processedValue = JSON.stringify(value)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(item as { [key: string]: any })[key] = processedValue
    }
  }
  return data
}

function parseObjects<T>(data: T[]): T[] {
  for (const item of data) {
    for (const [key, value] of Object.entries(item)) {
      let processedValue = value
      if (typeof value === 'string' && (value[0] === '{' || value[0] === '[')) {
        processedValue = JSON.parse(value)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(item as { [key: string]: any })[key] = processedValue
    }
  }
  return data
}

type Args = {
  klass: Klass
  filters: Filters
}

type Filters = { [key: string]: string | number }

// TODO: Make indexing explicit
type ColumnMapping = {
  key: string
  columnName: string
  columnSql: string
  isIndexed: boolean
}
