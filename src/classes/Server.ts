import dotenv from 'dotenv'
import express, { Express } from 'express'

const { log } = console

dotenv.config()

export class Server {
  private _port: number
  private _express: Express

  constructor() {
    this._port = parseFloat(process.env.SERVER_PORT as string)
    this._express = express()
  }

  get port(): number {
    return this._port
  }

  get express(): Express {
    return this._express
  }

  start(): void {
    const port = this._port
    this._express.listen({ port }, () => {
      log(`Server running at http://localhost:${port}`)
    })
  }
}
