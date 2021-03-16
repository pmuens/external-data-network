import express, { Express } from 'express'

const { log } = console

export class Server {
  private _port: number
  private _express: Express

  constructor(port: number) {
    this._port = port
    this._express = express()
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
