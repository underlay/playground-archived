import React from "react"
import { nodes, LABEL, SourcedNode, flattenValues, TYPE, ID } from "./schema"
import View from "./view"
import { Map } from "immutable"

interface ObjectProps {
	node: SourcedNode
	focus: boolean
	graph: Map<string, SourcedNode>
	disabled: boolean
	onSubmit: () => void
}

export default function ObjectView(props: ObjectProps) {
	const { node, focus, disabled, onSubmit, graph } = props
	const types = flattenValues(node[TYPE])
	const id = node[ID]
	const labels = types.map(type => nodes[type][LABEL]).join(", ")
	return (
		<div className="object">
			<h3>{id}</h3>
			{labels}
			<input
				type="button"
				value="Add"
				autoFocus={focus}
				disabled={disabled}
				onClick={onSubmit}
			/>
			<hr />
			<View node={node} graph={graph} />
		</div>
	)
}
