import React, { Fragment } from "react"
import {
	nodes,
	LABEL,
	SourcedNode,
	flattenValues,
	TYPE,
	ID,
	SourcedValues,
	TIME,
	SOURCE,
} from "./schema"
import View from "./views"
import { Map } from "immutable"

interface ObjectProps {
	node: SourcedNode
	focus: boolean
	graph: Map<string, SourcedNode>
	disabled: boolean
	onSubmit: () => void
}

interface ObjectState {
	type: string
	types: string[]
}

export default class ObjectView extends React.Component<
	ObjectProps,
	ObjectState
> {
	constructor(props: ObjectProps) {
		super(props)
		const types = flattenValues(props.node[TYPE])
		const [type] = types
		this.state = { type, types }
	}
	static getDerivedStateFromProps(props: ObjectProps, state: ObjectState) {
		const types = flattenValues(props.node[TYPE])
		const [type] = types
		return { type, types }
	}
	render() {
		const { node, focus, disabled, onSubmit, graph } = this.props
		const { types, type } = this.state
		const {
			[ID]: id,
			[TYPE]: _type,
			[SOURCE]: _source,
			[TIME]: _time,
			...rest
		} = node
		const props = rest as { [prop: string]: SourcedValues }
		const labels = types.map((type, key) => (
			<Fragment key={key}>
				{key ? <span> </span> : null}
				<a>{nodes[type][LABEL]}</a>
			</Fragment>
		))
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
				<View type={type} props={props} graph={graph} />
			</div>
		)
	}
}
