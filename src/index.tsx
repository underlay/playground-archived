/// <reference path="../manual_typings/ipfs.d.ts" />

import React from "react"
import ReactDOM from "react-dom"
import multihashing from "multihashing"
import multihash from "multihashes"
import { Buffer } from "buffer"

import Underground, { UndergroundProps } from "./underground"
import { AssertionGraph } from "./schema/types"
import { topic } from "./utils/constants"
import createNode from "./utils/ipfs"
import generateProv from "./provenance"

const main = document.querySelector("main")
// const loader = document.querySelector(".loader")

async function handleSubmit(ipfs: ipfs, graph: AssertionGraph) {
	// The graph has been compacted and already has @context inside
	const { id } = await ipfs.id()
	const assertion = await generateProv(id, graph, ipfs)
	const data = Buffer.from(JSON.stringify(assertion), "utf8")
	ipfs.pubsub.publish(topic, data)
}

async function handleDownload(ipfs: ipfs, graph: AssertionGraph) {
	const { id } = await ipfs.id()
	const assertion = await generateProv(id, graph, ipfs)
	const json = JSON.stringify(assertion)
	const cid = await ipfs.dag.put(assertion, {
		format: "dag-cbor",
		hashAlg: "sha2-256",
	})
	const hash = cid.toBaseEncodedString()
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
		onDownload: (graph: AssertionGraph) => handleDownload(ipfs, graph),
	}
	ReactDOM.render(<Underground {...props} />, main)
})
