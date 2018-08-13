/// <reference path="../manual_typings/ipfs.d.ts" />

import React from "react"
import ReactDOM from "react-dom"
import multihashing from "multihashing"
import multihash from "multihashes"
import { Buffer } from "buffer"

import Underground, { UndergroundProps } from "./underground"
import { AssertionGraph } from "./schema/types"
import { dagOptions, topic } from "./utils/constants"
import createNode from "./utils/ipfs"
import generateProv from "./provenance"

const main = document.querySelector("main")
// const loader = document.querySelector(".loader")

async function handleSubmit(ipfs: ipfs, graph: AssertionGraph) {
	console.log(graph)
	const { id } = await ipfs.id()
	// const graphCid = await ipfs.dag.put(graph, dagOptions)
	// const assertionHash = graphCid.toBaseEncodedString()
	// const provenance = generateProv(id, assertionHash)
	const label = "_:graph"
	const provenance = generateProv(id, label)
	// const provenanceCid = await ipfs.dag.put(provenance, dagOptions)
	// const provenanceHash = provenanceCid.toBaseEncodedString()
	const data = Buffer.from(
		JSON.stringify({
			"@graph": [
				// 	{ "@index": "/", "@value": assertionHash },
				// 	{ "@index": "/", "@value": provenanceHash },
				{ "@id": label, "@graph": graph },
				provenance,
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
	const props: UndergroundProps = {
		ipfs,
		onSubmit: (graph: AssertionGraph) => handleSubmit(ipfs, graph),
		onDownload,
	}
	ReactDOM.render(<Underground {...props} />, main)
})
