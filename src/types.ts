export type Klass = {
  name: string
  types: Types
}

export type Types = { [key: string]: string }

// TODO: Enforce non-empty `DBFilters` via type system
export type DBFilters = { [key: string]: string | number }
