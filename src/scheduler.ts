import cron from 'node-cron'

const { log } = console

export class Scheduler {
  private _tasks: Task[]

  constructor() {
    this._tasks = []
  }

  add(callback: Callback, crontab: string): void {
    this._tasks.push({ callback, crontab })
  }

  start(): void {
    for (const task of this._tasks) {
      log(`Starting task "${task.callback.name}"...`)
      cron.schedule(task.crontab, task.callback)
    }
  }
}

type Task = {
  callback: Callback
  crontab: string
}

type Callback = () => Promise<void> | void
