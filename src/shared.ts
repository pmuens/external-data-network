/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs'
import crypto from 'crypto'
import { join } from 'path'

import { Klass, JobConfig } from './types'

export function loadModule<T>(name: string, args: unknown[]): T {
  const devRegistryPath = getDevRegistryPath()

  if (fs.existsSync(devRegistryPath)) {
    try {
      return loadModuleFromDevRegistry(name, args)
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e
      }
    }
  }

  return loadModuleFromCoreRegistry(name, args)
}

export function loadJobConfigs(): JobConfig[] {
  return loadJobConfigsFromEdnDir()
}

export function getClassName(klass: Klass): string {
  if (typeof klass === 'function') {
    return klass.name
  }
  return klass.constructor.name
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

// Adaption of: https://stackoverflow.com/a/27747377
export function getRandomId(): string {
  return crypto.randomBytes(20).toString('hex')
}

function toSeparatedCase(str: string, sep: string): string {
  return (
    str[0].toLowerCase() +
    str.slice(1, str.length).replace(/[A-Z]/g, (letter) => `${sep}${letter.toLowerCase()}`)
  )
}

function loadModuleFromDevRegistry(name: string, args: unknown[]) {
  const devRegistryPath = getDevRegistryPath()
  const modulePath = join(devRegistryPath, name)
  return createInstance(modulePath, name, args)
}

function loadModuleFromCoreRegistry(name: string, args: unknown[]) {
  const registryPath = join(__dirname, 'registry')
  const modulePath = join(registryPath, name)
  return createInstance(modulePath, name, args)
}

function createInstance(path: string, name: string, args: unknown[]) {
  const Klass = require(path)[name]
  return new Klass(...args)
}

function loadJobConfigsFromEdnDir(): JobConfig[] {
  const dotEdnDirPath = getDotEdnDirPath()
  const jobsFilePath = join(dotEdnDirPath, 'jobs')
  return require(jobsFilePath)
}

function getDotEdnDirPath(): string {
  return join(process.cwd(), '.edn')
}

function getDevRegistryPath(): string {
  const dotEdnDirPath = getDotEdnDirPath()
  return join(dotEdnDirPath, 'registry')
}
