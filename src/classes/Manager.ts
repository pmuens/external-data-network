import { Job } from './Job'
import { Scheduler } from './Scheduler'
import { loadJobConfigs } from '../shared'
import { Singletons } from '../types'

const { log } = console

export class Manager {
  private _scheduler: Scheduler
  private _singletons: Singletons

  constructor(scheduler: Scheduler, singletons: Singletons) {
    this._scheduler = scheduler
    this._singletons = singletons
  }

  async setup(): Promise<void> {
    const configs = loadJobConfigs()

    for (const config of configs) {
      const { name } = config
      const job = new Job(config, this._singletons)

      const func = job.getFunc()
      const { type, args } = job.getConfig()

      if (type === 'startup') {
        await func()
        log(`[${type}]: Ran "${name}"`)
      } else if (type === 'schedule') {
        const crontab = args[0] as string
        this._scheduler.add(func, crontab)
        log(`[${type}]: Scheduled "${name}" with "${crontab}"`)
      }
    }
  }
}
