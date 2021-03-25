import dotenv from 'dotenv'

import { JobConfig } from '../../types'

dotenv.config()

const TMP_DIR_PATH = process.env.TMP_DIR_PATH as string
const RESULT_FILE_NAME = process.env.RESULT_FILE_NAME as string

const jobs: JobConfig[] = [
  {
    name: 'StoreSourceData',
    run: 'startup',
    source: {
      name: 'TestSource',
      args: ['Crypto Enthusiasts', true]
    },
    destination: 'DB'
  },
  {
    name: 'ExportSourceData',
    run: 'startup',
    source: 'DB',
    destination: {
      name: 'TestDestination',
      args: [TMP_DIR_PATH, RESULT_FILE_NAME]
    },
    transformer: {
      name: 'TestTransformer',
      args: ['Crypto Enthusiasts']
    }
  }
]

export = jobs
