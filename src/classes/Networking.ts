import dotenv from 'dotenv'
import Libp2p from 'libp2p'
import MPLEX from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'
import TCP from 'libp2p-tcp'
import MulticastDNS from 'libp2p-mdns'
import Bootstrap from 'libp2p-bootstrap'
import DHT from 'libp2p-kad-dht'

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
        dht: DHT,
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
        },
        dht: {
          enabled: true,
          kBucketSize: 20,
          randomWalk: {
            enabled: true,
            interval: 300e3,
            timeout: 10e3
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
      await this._registerGraphQlServer(connection)
    })

    node.connectionManager.on('peer:disconnect', async (connection) => {
      log(`Disconnected from ${connection.remotePeer.toB58String()}`)
      await this._deregisterGraphQlServer(connection)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _registerGraphQlServer(connection: any) {
    const address = connection.remoteAddr.nodeAddress().address
    const url = this._ctx.graphql.getUrl(address)
    try {
      await this._ctx.graphql.register(url)
      log(`Successfully registered GraphQL server ${url}`)
    } catch (error) {
      log(`Failed to register GraphQL server ${url}:`, error)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _deregisterGraphQlServer(connection: any) {
    const address = connection.remoteAddr.nodeAddress().address
    const url = this._ctx.graphql.getUrl(address)
    try {
      await this._ctx.graphql.deregister(url)
      log(`Successfully deregistered GraphQL server ${url}`)
    } catch (error) {
      log(`Failed to deregister GraphQL server ${url}:`, error)
    }
  }
}
