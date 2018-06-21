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
import { View, ViewProps } from "./views"
import { Map, Set, List } from "immutable"

export interface ObjectProps {
	className: string
	node: SourcedNode
	focus: boolean
	depth: number
	graph: Map<string, SourcedNode>
	disabled: boolean
	onSubmit: () => void
	onExplore: (path: string[]) => void
	onExploreRemove?: () => void
	explorer: Set<List<string>>
	onFocus: (focus: string) => void
	focused: string
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
		const {
			node,
			focus,
			disabled,
			onSubmit,
			graph,
			depth,
			className,
			onExplore,
			onExploreRemove,
			explorer,
			focused,
			onFocus,
		} = this.props
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
		const path = [id]
		const properties: ViewProps = {
			path,
			onExplore,
			type,
			props,
			graph,
			depth,
			explorer,
			root: true,
			onFocus,
			focused,
		}
		const makeId = path =>
			path.map(v => (nodes.hasOwnProperty(v) ? nodes[v][LABEL] : v)).join("/")
		const exp = explorer.find(e => makeId(e.slice(1)) === makeId(path))
		/*
		-webkit-box-shadow: 0px 0px 5px 5px rgba(233,51,40,1);
		-moz-box-shadow: 0px 0px 5px 5px rgba(233,51,40,1);
		box-shadow: 0px 0px 5px 5px rgba(233,51,40,1);
		*/
		const style =
			focused === id && exp
				? {
						// border: `2px solid ${exp.get(0)}`,
						// borderRadius: 2,
						boxShadow: `0px 0px 5px 5px ${exp.get(0)}`,
				  }
				: {}
		return (
			<div
				className={className + "object" + (focused === id ? " focused" : "")}
				style={style}
				onMouseEnter={event => onFocus(id)}
				onMouseLeave={event => onFocus(null)}
			>
				<h3 className="mono">
					<a href={`#${id}`}>{id}</a>
				</h3>
				{labels}
				<input
					className="float"
					type="button"
					value={onExploreRemove ? "Remove" : "Add"}
					autoFocus={focus}
					disabled={disabled}
					onClick={onExploreRemove || onSubmit}
				/>
				<hr />
				<View {...properties} />
			</div>
		)
	}
}
