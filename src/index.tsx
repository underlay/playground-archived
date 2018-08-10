/// <reference path="../manual_typings/ipfs.d.ts" />

import React from "react"
import ReactDOM from "react-dom"
import multihashing from "multihashing"
import multihash from "multihashes"
import { Buffer } from "buffer"

import Underground, { UndergroundProps } from "./underground"
import { AssertionGraph } from "./schema/types"
import createNode from "./utils/ipfs"
import generateProv from "./provenance"

const main = document.querySelector("main")
const loader = document.querySelector(".loader")
const topic = "http://underlay.mit.edu/assertion"
const dagOptions = { format: "dag-cbor", hashAlg: "sha2-256" }

async function handleSubmit(ipfs: ipfs, graph: AssertionGraph) {
	console.log(graph)
	const { id } = await ipfs.id()
	const graphCid = await ipfs.dag.put(graph, dagOptions)
	const assertionHash = graphCid.toBaseEncodedString()
	const provenance = generateProv(id, assertionHash)
	const provenanceCid = await ipfs.dag.put(provenance, dagOptions)
	const provenanceHash = provenanceCid.toBaseEncodedString()
	const data = Buffer.from(
		JSON.stringify({
			"@context": { "@vocab": "https://w3id.org/security/v1" },
			"@graph": [
				{ "@index": "/", "@value": assertionHash },
				{ "@index": "/", "@value": provenanceHash },
			],
		}),
		"utf8"
	)
	ipfs.pubsub.publish(topic, data)
}

function onDownload(assertion: AssertionGraph) {
	const json = JSON.stringify(assertion)
	const bytes = Buffer.from(json, "utf8")
	const mhash = multihashing(bytes, "sha2-256")
	const hash = multihash.toB58String(mhash)
	console.log("got the hash", hash)
	const element = document.createElement("a")
	element.setAttribute(
		"href",
		"data:application/json;charset=utf-8," + encodeURIComponent(json)
	)
	element.setAttribute("download", `${hash}.json`)
	element.style.display = "none"
	document.body.appendChild(element)
	element.click()
	document.body.removeChild(element)
}

createNode().then(async ipfs => {
	console.log("ipfs", ipfs)
	// ipfs.pubsub.subscribe(topic, pubsubOptions, (message: libp2p.Message) => {})
	const props: UndergroundProps = {
		onSubmit: (graph: AssertionGraph) => handleSubmit(ipfs, graph),
		onDownload,
	}
	document.body.removeChild(loader)
	ReactDOM.render(<Underground {...props} />, main)
})
