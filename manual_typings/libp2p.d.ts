/// <reference path="./multiaddr.d.ts" />

import { create } from "domain"

export as namespace libp2p

export = libp2p

type Callback<T> = (error: Error, result?: T) => void
type VoidCallback = (error?: Error) => void

declare namespace libp2p {
	type Peer = PeerInfo | PeerId | Multiaddr | string
	export class Node {
		constructor(peerInfo: PeerInfo, peerBook: PeerBook, options: Object)

		stop(callback?: VoidCallback)
		stop(callback?: VoidCallback)

		dial(peer: Peer, callback: Callback<Connection>)

		dialProtocol(peer: Peer, protocol: string, callback: Callback<Connection>)

		hangUp(peer: Peer, callback: VoidCallback)

		peerBook: PeerBook
		peerRouting: PeerRoutingAPI
		contentRouting: ContentRoutingAPI
		pubsub: PubSubAPI

		handle(
			protocol: string,
			handlerFunc: (protocol: string, conn: Connection) => void,
			matchFunc?: (
				protocol: string,
				requestedProtocol: string,
				callback: (error: Error, match: boolean) => void
			) => void
		)

		unhandle(protocol: string)

		on(event: string, handler: (peer: PeerInfo) => void)

		isStarted(): boolean
		ping(peer: Peer, options: Object, callback: Callback<void>)
		ping(peer: Peer, callback: Callback<void>)
	}

	interface PeerRoutingAPI {
		findPeer(id: PeerId, callback: Callback<PeerInfo>)
	}

	interface ContentRoutingAPI {
		findProviders(key: Buffer, timeout: number, callback: Callback<void>)
		provide(key: Buffer, callback: Callback<void>)
	}

	export interface Message {
		from: string
		seqno: Buffer
		data: Buffer
		topicIDs: string[]
	}

	export interface PubSubAPI {
		subscribe(
			topic: string,
			handler: (msg: Message) => void,
			options: Object,
			callback: VoidCallback
		)
		subscribe(
			topic: string,
			handler: (msg: Message) => void,
			options: Object
		): Promise<void>

		unsubscribe(topic: string, handler: (msg: Message) => void)

		publish(topic: string, data: Buffer, callback: VoidCallback)
		publish(topic: string, data: Buffer): Promise<void>
		ls(callback: Callback<string[]>)
		ls(): Promise<string[]>
		peers(topic: string, callback: Callback<string[]>)
		peers(topic: string): Promise<string[]>
	}

	export interface Connection {
		getObservedAddrs(callback: Callback<Multiaddr[]>)
		getPeerInfo(callback: Callback<PeerInfo>)
		setPeerInfo(peerInfo: PeerInfo)
	}

	interface PeerJSON {
		id: string
		pubKey: string
		privKey: string
	}

	export class PeerInfo {
		constructor(id?: PeerId)
		create(callback: Callback<PeerInfo>)
		create(id: PeerId | PeerJSON, callback: Callback<PeerInfo>)
		id: PeerId
		multiaddrs: Multiaddr[]
	}

	export class PeerId {
		constructor(id: Buffer)
		constructor(id: Buffer, privKey: any, pubKey: any)

		create(options: Object, callback: Callback<PeerId>)
		createFromHexString(str: string): PeerId
		createFromBytes(buf: Buffer): PeerId
		createFromB58String(str: string): PeerId
		createFromPubKey(pubKey: Buffer): PeerId
		createFromPrivKey(privKey: Buffer): PeerId
		createFromJSON(options: PeerJSON): PeerId

		toHexString(): string
		toBytes(): Buffer
		toB58String(): string
		toJSON(): PeerJSON
		toPrint(): PeerJSON
		isEqual(id: PeerId | Buffer): boolean
	}

	export interface PeerBook {
		put(peerInfo: PeerInfo, replace: boolean): PeerInfo
		get(peer: Peer): PeerInfo
		has(peer: Peer): boolean
		getAll(): { [id: string]: PeerInfo }
		getAllArray(): PeerInfo[]
		getMultiaddrs(peer: Peer): Multiaddr[]
		remove(peer: Peer)
	}
}
