import React from "react"
import { nodes, LABEL } from "./schema"

interface ObjectProps {
	id: string
	types: string[]
	focus: boolean
	disabled: boolean
	onSubmit: () => void
}

export default function ObjectView(props: ObjectProps) {
	const { id, types, focus, disabled, onSubmit } = props
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
				onClick={event => onSubmit()}
			/>
		</div>
	)
}
