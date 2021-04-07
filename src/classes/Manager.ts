import { Job } from './Job'
import { Scheduler } from './Scheduler'
import { loadJobConfigs } from '../shared'
import { Context } from '../types'

const { log } = console

export class Manager {
  private _ctx: Context
  private _scheduler: Scheduler

  constructor(ctx: Context, scheduler: Scheduler) {
    this._ctx = ctx
    this._scheduler = scheduler
  }

  async setup(): Promise<void> {
    const configs = loadJobConfigs()

    for (const config of configs) {
      const { name } = config
      const job = new Job(this._ctx, config)

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
