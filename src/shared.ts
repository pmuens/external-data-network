import { Klass } from './types'

export function isKlass<T>(input: Klass | T): input is Klass {
  return (input as Klass).name !== undefined
}

export function toPascalCase(str: string): string {
  return str[0].toLocaleUpperCase() + str.slice(1, str.length)
}

export function toCamelCase(str: string): string {
  return str[0].toLowerCase() + str.slice(1, str.length)
}

export function toSnakeCase(str: string): string {
  return (
    str[0].toLowerCase() +
    str.slice(1, str.length).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  )
}
