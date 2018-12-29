import IPFS from "ipfs"
import KadDHT from "libp2p-kad-dht"

const defaultOptions: ipfs.Options = {
	EXPERIMENTAL: {
		pubsub: true,
		sharding: true,
		dht: true,
	},
	libp2p: {
		modules: { dht: KadDHT },
		config: {
			dht: { kBucketSize: 20 },
		},
	},
	relay: {
		enabled: true,
		hop: {
			enabled: true,
			active: false,
		},
	},
}

async function publishKey(ipfs: ipfs) {
	const { id, publicKey } = await ipfs.id()
	const bytes = ipfs.types.Buffer.from(publicKey, "base64")
	const { cid } = await ipfs.block.put(bytes)
	console.assert(id === cid.toBaseEncodedString())
	console.log("ready:", id)
	return ipfs
}

export default function(options?: ipfs.Options): Promise<ipfs> {
	return new Promise((resolve, reject) => {
		const clonedOptions = Object.assign({}, defaultOptions)
		const mergedOptions =
			typeof options === "object"
				? Object.assign(clonedOptions, options)
				: clonedOptions
		console.log("mergedOptions", mergedOptions)
		const node: ipfs = new IPFS(mergedOptions)
		console.log("got node", node)
		node.on("error", (error: string) => reject(error))
		node.on("ready", () => publishKey(node).then(resolve))
	})
}
