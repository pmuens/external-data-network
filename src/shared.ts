import fs from 'fs'
import { join } from 'path'

export function loadModule<T>(name: string, args: unknown[]): T {
  if (fs.existsSync(devRegistryPath)) {
    try {
      return loadFromDevRegistry(name, args)
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e
      }
    }
  }
  return loadFromCoreRegistry(name, args)
}

export function toPascalCase(str: string): string {
  return str[0].toLocaleUpperCase() + str.slice(1, str.length)
}

export function toCamelCase(str: string): string {
  return str[0].toLowerCase() + str.slice(1, str.length)
}

export function toSnakeCase(str: string): string {
  return toSeparatedCase(str, '_')
}

export function toDashedCase(str: string): string {
  return toSeparatedCase(str, '-')
}

function toSeparatedCase(str: string, sep: string): string {
  return (
    str[0].toLowerCase() +
    str.slice(1, str.length).replace(/[A-Z]/g, (letter) => `${sep}${letter.toLowerCase()}`)
  )
}

function loadFromDevRegistry(name: string, args: unknown[]) {
  const fileName = toDashedCase(name)
  const registryPath = devRegistryPath
  const modulePath = join(registryPath, fileName)
  return createInstance(modulePath, name, args)
}

function loadFromCoreRegistry(name: string, args: unknown[]) {
  const fileName = toDashedCase(name)
  const registryPath = join(__dirname, 'registry')
  const modulePath = join(registryPath, fileName)
  return createInstance(modulePath, name, args)
}

function createInstance(path: string, name: string, args: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Klass = require(path)[name]
  return new Klass(...args)
}

const devRegistryPath = join(process.cwd(), '.edn', 'registry')
