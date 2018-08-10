const IPFS = require("ipfs")

const defaultOptions: ipfs.Options = {
	EXPERIMENTAL: {
		pubsub: true,
		// sharding: true,
		// dht: true,
	},
	// relay: {
	// 	enabled: true,
	// 	hop: { enabled: false },
	// },
	// libp2p: {
	// 	config: {
	// 		peerDiscovery: {},
	// 	},
	// },
	// config: {
	// 	Addresses: {
	// 		API: "",
	// 		Gateway: "",
	// 		Swarm: [
	// 			"/ip4/0.0.0.0/tcp/0",
	// 			"/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star",
	// 		],
	// 	},
	// },
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
		node.on("ready", () => resolve(node))
	})
}
