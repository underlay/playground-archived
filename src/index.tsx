import React from "react"
import ReactDOM from "react-dom"
import { Buffer } from "buffer"
import multihashing from "multihashing"
import multihash from "multihashes"

import Underground from "./underground"
import { Node } from "./schema"

const main = document.querySelector("main")
ReactDOM.render(<Underground onSubmit={handleSubmit} />, main)

function handleSubmit(graph: { "@graph": Node[] }) {
	console.log(graph)
	download(JSON.stringify(graph))
}

function download(json: string) {
	const element = document.createElement("a")
	element.setAttribute(
		"href",
		"data:application/json;charset=utf-8," + encodeURIComponent(json)
	)
	const bytes = Buffer.from(json, "utf8")
	const hash = multihashing(bytes, "sha1")
	const b58 = multihash.toB58String(hash)
	element.setAttribute("download", `${b58}.json`)
	element.style.display = "none"
	document.body.appendChild(element)
	element.click()
	document.body.removeChild(element)
}
