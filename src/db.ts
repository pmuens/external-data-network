import Database, { Database as BetterSqlite3 } from 'better-sqlite3'

export class DB {
  private _db: BetterSqlite3

  constructor(filePath: string) {
    this._db = new Database(filePath)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert<A extends Klass, B>(klass: A, data: B[]): number {
    this.ensureTable(klass, data)

    const name = getTableName(klass)
    const mappings = getColumnMappings(data)

    const columnNames = mappings.map((item) => item.columnName).join(',')
    const placeholders = mappings.map(() => '?').join(',')
    const INSERT_SQL = this._db.prepare(
      `INSERT INTO ${name} (${columnNames}) VALUES (${placeholders});`
    )

    let inserted = 0
    this._db.transaction((data: B[]) => {
      data = stringifyObjects(data)
      for (const item of data) {
        const values = Object.values(item)
        const { changes } = INSERT_SQL.run(values)
        if (changes > 0) inserted++
      }
    })(data)

    return inserted
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  find<A extends Klass>(klass: A, filters: Filters): any[] {
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

  private ensureTable<A extends Klass, B>(klass: A, data: B[]) {
    const name = getTableName(klass)
    const mappings = getColumnMappings(data)

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

function getTableName<A extends Klass>(klass: A): string {
  return toSnakeCase(klass.name)
}

function getColumnName(key: string): string {
  return toSnakeCase(key)
}

function getColumnMappings<T>(data: T[]): ColumnMapping[] {
  const item = data[0]
  const result: ColumnMapping[] = []
  for (const [key, value] of Object.entries(item)) {
    const columnName = getColumnName(key)
    if (typeof value === 'string') {
      result.push({
        key,
        columnName,
        columnSql: 'VARCHAR(255) NOT NULL',
        isIndexed: true
      })
    } else if (typeof value === 'number') {
      result.push({
        key,
        columnName,
        columnSql: 'INTEGER NOT NULL',
        isIndexed: false
      })
    } else if (typeof value === 'object') {
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

function toSnakeCase(str: string): string {
  return (
    str[0].toLowerCase() +
    str.slice(1, str.length).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  )
}

// TODO: Make indexing explicit
type ColumnMapping = {
  key: string
  columnName: string
  columnSql: string
  isIndexed: boolean
}

// TODO: Enforce non-empty Filters via type system
type Filters = { [key: string]: string | number }

type Klass = {
  name: string
}
