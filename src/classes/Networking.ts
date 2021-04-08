import dotenv from 'dotenv'
import Libp2p from 'libp2p'
import MPLEX from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'
import TCP from 'libp2p-tcp'
import MulticastDNS from 'libp2p-mdns'
import Bootstrap from 'libp2p-bootstrap'

import { Context } from '../types'

const { log } = console

dotenv.config()

export class Networking {
  private _ctx: Context
  private _host: string
  private _port: number
  private _bootstrap_addrs: string[]
  private _node: Libp2p | null

  constructor(ctx: Context) {
    const addr = process.env.P2P_BOOTSTRAP_MULTIADDR as string
    this._ctx = ctx
    this._host = process.env.HOST as string
    this._port = parseFloat(process.env.P2P_PORT as string)
    this._bootstrap_addrs = [addr]
    this._node = null
  }

  async setup(): Promise<void> {
    const address = `/ip4/${this._host}/tcp/${this._port}`

    this._node = await Libp2p.create({
      addresses: {
        listen: [address]
      },
      modules: {
        transport: [TCP],
        connEncryption: [NOISE],
        streamMuxer: [MPLEX],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        peerDiscovery: [MulticastDNS, Bootstrap]
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          [MulticastDNS.tag]: {
            enabled: true,
            interval: 1000
          },
          [Bootstrap.tag]: {
            enabled: true,
            interval: 2000,
            list: this._bootstrap_addrs
          }
        }
      }
    })
  }

  async start(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const node = this._node!
    await node.start()

    const listenAddrs = node.multiaddrs.map(
      (addr) => `${addr.toString()}/p2p/${node.peerId.toB58String()}`
    )
    log(`Libp2p running at ${listenAddrs.join(' ')}`)

    node.connectionManager.on('peer:connect', async (connection) => {
      log(`Connected to ${connection.remotePeer.toB58String()}`)
      await this._registerGraphQlEndpoint(connection)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _registerGraphQlEndpoint(connection: any) {
    // TODO: Make `port` optional
    // TODO: Make `protocol` and `path `configurable
    const protocol = 'http'
    const path = 'graphql'
    const port = this._ctx.server.port
    const address = connection.remoteAddr.nodeAddress().address
    const endpoint = `${protocol}://${address}:${port}/${path}`
    try {
      await this._ctx.graphql.register(endpoint)
      await this._ctx.graphql.reload()
      log(`Successfully registered GraphQL endpoint ${endpoint}`)
    } catch (error) {
      log(`Failed to register GraphQL endpoint ${endpoint}:`, error)
    }
  }
}
