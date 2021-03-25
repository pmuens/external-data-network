import os from 'os'
import fs from 'fs-extra'
import path from 'path'

import { DB, GraphQL, Manager, Scheduler, Server } from '../../src/classes'

describe('Module Integration Test', () => {
  let cwd: string
  let env: { [key: string]: unknown }
  let tmpDirPath: string
  let resultFilePath: string

  beforeEach(async () => {
    // Store information about the current environment
    cwd = process.cwd()
    env = { ...process.env }
    // Create a temporary directory we use to operate in
    tmpDirPath = path.join(os.tmpdir(), (+new Date()).toString())
    await fs.mkdir(tmpDirPath)
    // Create file- and path name variables
    const resultFileName = 'data.json'
    const dbFilePath = path.join(tmpDirPath, 'app.db')
    resultFilePath = path.join(tmpDirPath, resultFileName)
    // Set environment variables
    process.env.TMP_DIR_PATH = tmpDirPath
    process.env.RESULT_FILE_NAME = resultFileName
    process.env.DB_FILE_PATH = dbFilePath
    // Change to the test directory which contains the `.edn` directory
    process.chdir(__dirname)
  })

  afterEach(() => {
    // Recover old environment
    process.env = env as NodeJS.ProcessEnv
    process.chdir(cwd)
  })

  it('should run the jobs defined in the config file', async () => {
    const port = 5000

    const db = new DB()
    const server = new Server(port)
    const graphql = new GraphQL(server, db)
    const scheduler = new Scheduler()
    const manager = new Manager(scheduler, { db, graphql })

    await manager.setup()

    const result = await fs.readJSON(resultFilePath)

    expect(result).toEqual([
      {
        firstName: 'John',
        lastName: 'Doe',
        age: 42,
        hobbies: ['Computer Science', 'Programming', 'Mathematics'],
        skills: { rust: 10, cpp: 10, java: 8 },
        club: 'Crypto Enthusiasts',
        isActive: true,
        fullName: 'John Doe'
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        age: 24,
        hobbies: ['Tokenomics', 'Distributed Ledgers', 'Cryptocurrencies'],
        skills: { blockchain: 8, dlts: 9, solidity: 10 },
        club: 'Crypto Enthusiasts',
        isActive: true,
        fullName: 'Jane Doe'
      }
    ])
  })
})
