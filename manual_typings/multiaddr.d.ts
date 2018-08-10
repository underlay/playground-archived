export as namespace Multiaddr
export = Multiaddr

type Buffer = any

declare class Multiaddr {
	constructor(addr: String | Buffer | Multiaddr)

	// Static
	static fromNodeAddress(addr: String, transport: String): Multiaddr
	static protocols: Multiaddr.Protocol[]
	static isMultiaddr: (addr: Multiaddr) => boolean
	static isName: (addr: Multiaddr) => boolean
	static resolve: (
		addr: Multiaddr,
		callback: (addrs: Multiaddr[]) => void
	) => boolean

	// Instance
	buffer: Buffer
	toString: () => string
	toOptions: () => {
		family: string
		host: string
		transport: string
		port: string
	}
	inspect: () => string
	protos: () => Multiaddr.Protocol[]
	protoCodes: () => number[]
	protoNames: () => string[]
	tuples: () => [number, Buffer][]
	stringTuples: () => [number, string | number][]
	encapsulate: (addr: Multiaddr) => Multiaddr
	decapsulate: (addr: Multiaddr) => Multiaddr
	getPeerId: () => string | null
	equals: (addr: Multiaddr) => boolean
	nodeAddress: () => { family: string; address: string; port: string }
	isThinWaistAddress: (addr?: Multiaddr) => boolean
	fromStupidString: (str?: string) => void
}

declare namespace Multiaddr {
	export interface Protocol {
		code: number
		size: number
		name: string
	}
}
