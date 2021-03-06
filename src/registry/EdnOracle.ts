import { ethers } from 'ethers'

import { Transformer, loadModule } from '../host'
import { EthereumEvents } from './EthereumEvents'
import { EthereumSmartContract } from './EthereumSmartContract'
import { SimpleRng } from './SimpleRng'

export class EdnOracle implements Transformer {
  async transform(source: EthereumEvents, destination: EthereumSmartContract): Promise<number> {
    const data = await source.read()

    let processed = 0

    const inputs = []
    for (const item of data) {
      const sender = item.arguments[0]
      const requestId = item.arguments[1]
      const jobName = item.arguments[2]
      const jobArgs = item.arguments[3]
      const cbFuncName = item.arguments[4]
      const customData = item.arguments[5]

      let result
      let jobResult
      // TODO: Add support for more jobs
      if (jobName === 'random') {
        const [min, max] = ethers.utils.defaultAbiCoder.decode(['uint64', 'uint64'], jobArgs)
        jobResult = await runRandomJob(min, max)
        result = ethers.utils.defaultAbiCoder.encode(['uint64'], [jobResult])
      }

      const abi = [
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256'
            },
            {
              internalType: 'bytes',
              name: 'result',
              type: 'bytes'
            },
            {
              internalType: 'bytes',
              name: 'customData',
              type: 'bytes'
            }
          ],
          name: cbFuncName,
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ]

      inputs.push({
        address: sender,
        abi,
        function: cbFuncName,
        args: [requestId, result, customData]
      })
      processed++
    }

    await destination.write(inputs)

    return processed
  }
}

async function runRandomJob(min: number, max: number): Promise<number> {
  const rng = loadModule<SimpleRng>('SimpleRng', [min, max])
  const result = await rng.read()
  return result[0].value
}
