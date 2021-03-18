import dotenv from 'dotenv'
import Database, { Database as BetterSqlite3 } from 'better-sqlite3'

import { toSnakeCase } from './shared'
import { Source, Sink } from './interfaces'
import { Klass, DataType } from './types'

dotenv.config()

const { DB_FILE_PATH } = process.env

export class DB implements Source, Sink {
  private _db: BetterSqlite3

  name = DB.name

  constructor(filePath: string = DB_FILE_PATH as string) {
    this._db = new Database(filePath)
  }

  // The `DB` as a `Source` is a special case since
  // the real output `DataType` varies during runtime
  // as we're able to query arbitrary data.
  getOutputDataType(): DataType {
    return { unknown: 'unknown' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async read<T>(args: T & Args): Promise<any[]> {
    const klass = args.klass
    const filters = args.filters
    return Promise.resolve(this._find(klass, filters))
  }

  async write<T>(source: Source, data: T[]): Promise<number> {
    this._ensureTable(source)
    const inserted = this._insert(source, data)
    return Promise.resolve(inserted)
  }

  private _insert<T>(source: Source, data: T[]): number {
    const name = getTableName(source)
    const mappings = getColumnMappings(source.getOutputDataType())

    const columnNames = mappings.map((item) => item.columnName).join(',')
    const placeholders = mappings.map(() => '?').join(',')
    const INSERT_SQL = this._db.prepare(
      `INSERT INTO ${name} (${columnNames}) VALUES (${placeholders});`
    )

    let inserted = 0
    this._db.transaction((data: T[]) => {
      data = stringifyObjects(data)
      for (const item of data) {
        const values = Object.values(item)
        const { changes } = INSERT_SQL.run(values)
        if (changes > 0) inserted++
      }
    })(data)

    return inserted
  }

  private _find(klass: Klass, filters: Filters): unknown[] {
    const name = getTableName(klass)
    let SQL = 'WHERE '
    const clauses = []
    const values = []
    for (const [key, value] of Object.entries(filters)) {
      clauses.push(`${getColumnName(key)} = ?`)
      values.push(value)
    }
    SQL += clauses.join(' AND ')

    const SELECT_SQL = this._db.prepare(`SELECT * FROM ${name} ${SQL};`)
    const result = SELECT_SQL.all(values)
    return parseObjects(result)
  }

  private _ensureTable(source: Source) {
    const name = getTableName(source)
    const mappings = getColumnMappings(source.getOutputDataType())

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

function getColumnMappings(type: DataType): ColumnMapping[] {
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

// TODO: Enforce non-empty `Filters` via type system
type Filters = { [key: string]: string | number }

// TODO: Make indexing explicit
type ColumnMapping = {
  key: string
  columnName: string
  columnSql: string
  isIndexed: boolean
}
