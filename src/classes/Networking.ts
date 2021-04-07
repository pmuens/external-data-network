import Libp2p from 'libp2p'
import MPLEX from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'
import TCP from 'libp2p-tcp'
import MulticastDNS from 'libp2p-mdns'
import Boostrap from 'libp2p-bootstrap'

const { log } = console

export class Networking {
  private _host: string
  private _port: number
  private _bootstrap_addrs: string[]
  private _node: Libp2p | null

  constructor(host: string, port: number, addr: string) {
    this._host = host
    this._port = port
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
        peerDiscovery: [MulticastDNS, Boostrap]
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          [MulticastDNS.tag]: {
            enabled: true,
            interval: 1000
          },
          [Boostrap.tag]: {
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

    node.connectionManager.on('peer:connect', (conn) => {
      log(`Connected to ${conn.remotePeer.toB58String()}`)
    })
  }
}
