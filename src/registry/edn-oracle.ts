import { ethers } from 'ethers'

import { Transformer } from '../host/interfaces'
import { EthereumEvents, Output as EEOutput } from './ethereum-events'
import { EthereumSmartContract, Input as ESCInput } from './ethereum-smart-contract'
import { SimpleRng } from './simple-rng'

export class EdnOracle implements Transformer<EEOutput, ESCInput> {
  name = EdnOracle.name

  async transform(source: EthereumEvents, sink: EthereumSmartContract): Promise<number> {
    const data = await source.read()

    let processed = 0

    const result = []
    for (const item of data) {
      const sender = item.arguments[0]
      const requestId = item.arguments[1]
      const jobName = item.arguments[2]
      const jobArgs = item.arguments[3]
      const cbFuncName = item.arguments[4]
      const customData = item.arguments[5]

      let response
      let jobResult
      // TODO: Add support for more jobs
      if (jobName === 'random') {
        const [min, max] = ethers.utils.defaultAbiCoder.decode(['uint64', 'uint64'], jobArgs)
        jobResult = await runRandomJob(min, max)
        response = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'uint64', 'bytes'],
          [requestId, jobResult, customData]
        )
      }

      const abi = [
        {
          inputs: [{ internalType: 'bytes', name: 'response', type: 'bytes' }],
          name: cbFuncName,
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ]

      result.push({ address: sender, abi, function: cbFuncName, args: [response] })
      processed++
    }

    await sink.write(result)

    return Promise.resolve(processed)
  }
}

async function runRandomJob(min: number, max: number): Promise<number> {
  const rng = new SimpleRng()
  const args = { min, max }
  const result = await rng.read(args)
  return result[0].value
}
