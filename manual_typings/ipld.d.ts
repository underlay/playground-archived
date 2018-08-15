/// <reference path="./multiaddr.d.ts" />
/// <reference path="./cid.d.ts" />

export as namespace IPLD
export = IPLD

type Callback<T> = (error: Error, result?: T) => void

type Result = { remainderPath: string; value: {} }

interface BlockService {}

interface Resolver {
	multicodec: string
	defaultHashAlg: string
	resolve(binaryBlob: Buffer, path: string, callback: Callback<Result>)
	tree(binaryBlob: Buffer, callback: Callback<string[]>)
}

interface Util {
	serialize(dagNode: {}, callback: Callback<Buffer>)
	deserialize(binaryBlob: Buffer, callback: Callback<{}>)
	cid(
		binaryBlob: Buffer,
		options: { version?: string; hashAlg?: string },
		callback: Callback<CID>
	)
	cid(binaryBlob: Buffer, callback: Callback<CID>)
}

interface Format {
	util: Util
	resolver: Resolver
}

type GetOptions = { localResolve?: boolean }
type PutOptions = { cid: CID } | { hashAlg: string; format: string }

declare interface IPLD {
	bs: BlockService
	resolvers: { [name: string]: Format }
	put(node: {}, options: PutOptions, callback: Callback<CID>)
	get(cid: CID, path: string, options: GetOptions, callback: Callback<Result>)
	get(cid: CID, path: string, callback: Callback<Result>)
	get(cid: CID, options: GetOptions, callback: Callback<Result>)
	get(cid: CID, callback: Callback<Result>)
	remove(cid: CID, callback: Callback<void>)
	support: {
		add(multicodec: string, resolver: Resolver, util: Util)
		rm(multicodec: string)
	}
}
