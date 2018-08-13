import React from "react"
import ReactJson from "react-json-view"
import { AssertionGraph } from "./schema/types"
import { GRAPH } from "./utils/constants"

interface AssertionProps {
	id: string
	time: number
	hash: string
	assertion: AssertionGraph
}
export default function(props: AssertionProps) {
	const date = new Date(props.time)
	const string = date.toString()
	return (
		<fieldset className="assertion">
			<legend>{props.hash}</legend>
			<div className="meta">
				<div>On {string}</div>
				<div>From {props.id}</div>
			</div>
			<ReactJson
				displayDataTypes={false}
				enableClipboard={false}
				src={props.assertion[GRAPH]}
			/>
		</fieldset>
	)
}
