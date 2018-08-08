import React from "react"
import ReactDOM from "react-dom"

import Underground from "./underground"
import { Assertion } from "./schema/types"

const main = document.querySelector("main")
ReactDOM.render(<Underground onSubmit={handleSubmit} />, main)

function handleSubmit(assertion: Assertion, hash: string) {
	console.log(assertion)
	download(JSON.stringify(assertion), hash)
}

function download(data: string, name: string) {
	const element = document.createElement("a")
	element.setAttribute(
		"href",
		"data:application/json;charset=utf-8," + encodeURIComponent(data)
	)
	element.setAttribute("download", `${name}.json`)
	element.style.display = "none"
	document.body.appendChild(element)
	element.click()
	document.body.removeChild(element)
}
