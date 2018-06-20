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
import { RealView } from "./views"
import { Map } from "immutable"

interface ObjectProps {
	large: boolean
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
				<span className="mono">{nodes[type][LABEL]}</span>
			</Fragment>
		))
		return (
			<div className={this.props.large ? "large object" : "object"}>
				<h3 className="mono">
					<a href={`#${id}`}>{id}</a>
				</h3>
				{labels}
				<input
					className="float"
					type="button"
					value="Add"
					autoFocus={focus}
					disabled={disabled}
					onClick={onSubmit}
				/>
				<hr />
				<RealView {...{ type, props, graph, depth: 0 }} />
				{/* <View type={type} props={props} graph={graph, depth: 0} /> */}
			</div>
		)
	}
}
