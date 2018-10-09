/// <reference path="./multiaddr.d.ts" />
/// <reference path="./multihash.d.ts" />
/// <reference path="./cid.d.ts" />
/// <reference path="./libp2p.d.ts" />
/// <reference path="./ipld.d.ts" />

export as namespace ipfs

export = IPFS

type Callback<T> = (error: Error, result?: T) => void
type VoidCallback = (error?: Error) => void

declare class IPFS {
	constructor(options: IPFS.Options)

	types: IPFS.Types

	init(options: IPFS.InitOptions, callback: Callback<boolean>)
	init(callback: Callback<boolean>)

	preStart(callback: Callback<any>)
	start(callback?: Callback<any>)
	stop(callback?: VoidCallback)
	isOnline(): boolean

	version(options: any, callback: (error: Error, version: IPFS.Version) => void)
	version(options: any): Promise<IPFS.Version>
	version(callback: (error: Error, version: IPFS.Version) => void)
	version(): Promise<IPFS.Version>

	id(options: any, callback: (error: Error, version: IPFS.Id) => void)
	id(options: any): Promise<IPFS.Id>
	id(callback: (error: Error, version: IPFS.Id) => void)
	id(): Promise<IPFS.Id>

	repo: IPFS.RepoAPI
	bootstrap: any
	config: any
	block: any
	object: IPFS.ObjectAPI
	dag: IPFS.DagAPI
	libp2p: libp2p.Node
	swarm: IPFS.SwarmAPI
	files: IPFS.FilesAPI
	bitswap: any

	// TODO: figure out why just .libp2p doesn't actually work
	_libp2pNode: libp2p.Node
	_ipld: IPLD

	ping(callback: (error: Error) => void)
	ping(): Promise<void>

	pubsub: libp2p.PubSubAPI

	on(event: string, callback: (error?: string) => void): IPFS
	once(event: string, callback: () => void): IPFS
}

declare namespace IPFS {
	export interface Options {
		init?: boolean
		start?: boolean
		EXPERIMENTAL?: any
		repo?: string
		config?: any
		libp2p?: {
			modules?: {
				[module: string]: any
			}
			config?: {
				peerDiscovery?: {
					[id: string]: { enabled: boolean; [prop: string]: any }
				}
				dht?: {
					[property: string]: any
				}
			}
		}
		relay?: {
			enabled?: boolean
			hop?: {
				enabled?: boolean
				active?: boolean
			}
		}
	}

	export interface InitOptions {
		emptyRepo?: boolean
		bits?: number
		log?: Function
	}

	export interface Types {
		Buffer: {
			from(
				other: string | number[] | Object | Buffer | ArrayBuffer,
				format?: string
			): Buffer
		}
		PeerId: libp2p.PeerId
		PeerInfo: libp2p.PeerInfo
		multiaddr: Multiaddr
		multihash: Multihash
		CID: { new (version: number, codec: string, multihash: Buffer): CID }
	}

	export interface Version {
		version: string
		repo: string
		commit: string
	}

	export interface Id {
		id: string
		publicKey: string
		addresses: Multiaddr[]
		agentVersion: string
		protocolVersion: string
	}

	export interface RepoAPI {
		init(bits: number, empty: boolean, callback: Callback<any>)

		version(options: any, callback: Callback<any>)
		version(callback: Callback<any>)

		gc()
		path(): string
	}

	export type FileContent = Object | Buffer | Blob | string

	export interface IPFSFile {
		path: string
		hash: string
		size: number
		content?: FileContent
	}

	export interface FilesAPI {
		createAddStream(options: any, callback: Callback<any>)
		createAddStream(callback: Callback<any>)

		createPullStream(options: any): any

		add(data: FileContent, options: any, callback: Callback<IPFSFile[]>)
		add(data: FileContent, options: any): Promise<IPFSFile[]>
		add(data: FileContent, callback: Callback<IPFSFile[]>)
		add(data: FileContent): Promise<IPFSFile[]>

		cat(hash: Multihash, callback: Callback<FileContent>)
		cat(hash: Multihash): Promise<FileContent>
		cat(hash: string, callback: Callback<FileContent>)
		cat(hash: string): Promise<FileContent>

		get(hash: Multihash, callback: Callback<IPFSFile[]>)
		get(hash: Multihash): Promise<IPFSFile[]>
		get(hash: string, callback: Callback<IPFSFile[]>)
		get(hash: string): Promise<IPFSFile[]>

		getPull(hash: Multihash, callback: Callback<any>)
		getPull(hash: Multihash): Promise<any>
		getPull(hash: string, callback: Callback<any>)
		getPull(hash: string): Promise<any>
	}

	export interface PeersOptions {
		v?: boolean
		verbose?: boolean
	}

	export interface Peer {
		addr: Multiaddr
		peer: libp2p.PeerInfo
	}

	export interface SwarmAPI {
		peers(options: PeersOptions, callback: Callback<Peer[]>)
		peers(options: PeersOptions): Promise<Peer[]>
		peers(callback: Callback<Peer[]>)
		peers(): Promise<Peer[]>

		addrs(callback: Callback<libp2p.PeerInfo[]>)
		addrs(): Promise<libp2p.PeerInfo[]>

		localAddrs(callback: Callback<Multiaddr[]>)
		localAddrs(): Promise<Multiaddr[]>

		connect(maddr: Multiaddr | string, callback: Callback<any>)
		connect(maddr: Multiaddr | string): Promise<any>

		disconnect(maddr: Multiaddr | string, callback: Callback<any>)
		disconnect(maddr: Multiaddr | string): Promise<any>

		filters(callback: Callback<void>): never
	}

	export type DAGNode = any
	export type DAGLink = any
	export type DAGLinkRef = DAGLink | any
	export type Obj = BufferSource | Object

	export interface ObjectStat {
		Hash: Multihash
		NumLinks: number
		BlockSize: number
		LinksSize: number
		DataSize: number
		CumulativeSize: number
	}

	export interface PutObjectOptions {
		enc?: any
	}

	export interface GetObjectOptions {
		enc?: any
	}

	export interface ObjectPatchAPI {
		addLink(
			multihash: Multihash,
			link: DAGLink,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		addLink(
			multihash: Multihash,
			link: DAGLink,
			options: GetObjectOptions
		): Promise<any>
		addLink(multihash: Multihash, link: DAGLink, callback: Callback<any>)
		addLink(multihash: Multihash, link: DAGLink): Promise<any>

		rmLink(
			multihash: Multihash,
			linkRef: DAGLinkRef,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		rmLink(
			multihash: Multihash,
			linkRef: DAGLinkRef,
			options: GetObjectOptions
		): Promise<any>
		rmLink(multihash: Multihash, linkRef: DAGLinkRef, callback: Callback<any>)
		rmLink(multihash: Multihash, linkRef: DAGLinkRef): Promise<any>

		appendData(
			multihash: Multihash,
			data: any,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		appendData(
			multihash: Multihash,
			data: any,
			options: GetObjectOptions
		): Promise<any>
		appendData(multihash: Multihash, data: any, callback: Callback<any>)
		appendData(multihash: Multihash, data: any): Promise<any>

		setData(
			multihash: Multihash,
			data: any,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		setData(
			multihash: Multihash,
			data: any,
			options: GetObjectOptions
		): Promise<any>
		setData(multihash: Multihash, data: any, callback: Callback<any>)
		setData(multihash: Multihash, data: any): Promise<any>
	}

	export interface ObjectAPI {
		"new"(template: "unixfs-dir", callback: Callback<DAGNode>)
		"new"(callback: Callback<DAGNode>)
		"new"(): Promise<DAGNode>

		put(obj: Obj, options: PutObjectOptions, callback: Callback<CID>)
		put(obj: Obj, options: PutObjectOptions): Promise<CID>
		put(obj: Obj, callback: Callback<CID>)
		put(obj: Obj): Promise<CID>

		get(
			multihash: Multihash,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		get(multihash: Multihash, options: GetObjectOptions): Promise<any>
		get(multihash: Multihash, callback: Callback<any>)
		get(multihash: Multihash): Promise<any>

		data(
			multihash: Multihash,
			options: GetObjectOptions,
			callback: Callback<any>
		)
		data(multihash: Multihash, options: GetObjectOptions): Promise<any>
		data(multihash: Multihash, callback: Callback<any>)
		data(multihash: Multihash): Promise<any>

		links(
			multihash: Multihash,
			options: GetObjectOptions,
			callback: Callback<DAGLink[]>
		)
		links(multihash: Multihash, options: GetObjectOptions): Promise<DAGLink[]>
		links(multihash: Multihash, callback: Callback<DAGLink[]>)
		links(multihash: Multihash): Promise<DAGLink[]>

		stat(
			multihash: Multihash,
			options: GetObjectOptions,
			callback: Callback<ObjectStat>
		)
		stat(multihash: Multihash, options: GetObjectOptions): Promise<ObjectStat>
		stat(multihash: Multihash, callback: Callback<ObjectStat>)
		stat(multihash: Multihash): Promise<ObjectStat>

		patch: ObjectPatchAPI
	}

	type DagGetResult = {
		value: any
		remainderPath: string
	}

	interface DagGetOptions {
		localResolve?: boolean
	}

	type DagTreeResult = string[]

	interface DagTreeOptions {
		recursive?: boolean
	}

	export interface DagAPI {
		put(dagNode: any, options: Object, callback: Callback<CID>)
		put(dagNode: any, options: Object): Promise<CID>

		get(
			cid: string | CID,
			path: string,
			options: DagGetOptions,
			callback: Callback<DagGetResult>
		)
		get(
			cid: string | CID,
			path: string,
			options: DagGetOptions
		): Promise<DagGetResult>
		get(cid: string | CID, path: string, callback: Callback<DagGetResult>)
		get(cid: string | CID, path: string): Promise<DagGetResult>
		get(cid: string | CID, callback: Callback<DagGetResult>)
		get(cid: string | CID): Promise<DagGetResult>

		tree(
			cid: string | CID,
			path: string,
			options: DagTreeOptions,
			callback: Callback<DagTreeResult>
		)
		tree(
			cid: string | CID,
			path: string,
			options: DagTreeOptions
		): Promise<DagTreeResult>
		tree(cid: string | CID, path: string, callback: Callback<DagTreeResult>)
		tree(cid: string | CID, path: string): Promise<DagTreeResult>
		tree(
			cid: string | CID,
			options: DagTreeOptions,
			callback: Callback<DagTreeResult>
		)
		tree(cid: string | CID, options: DagTreeOptions): Promise<DagTreeResult>
		tree(cid: string | CID, callback: Callback<DagTreeResult>)
		tree(cid: string | CID): Promise<DagTreeResult>
	}

	export function createNode(options: Options): IPFS
}
