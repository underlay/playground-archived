import React from "react"
import { SourcedNode, ID, flattenValues, TYPE } from "./schema"
import { Map } from "immutable"

interface ViewProps {
	graph: Map<string, SourcedNode>
	node: SourcedNode
}

interface ViewState {}

export default class View extends React.Component<ViewProps, ViewState> {
	constructor(props: ViewProps) {
		super(props)
	}
	render() {
		const type = Object.keys(View.renderers).find(type =>
			flattenValues(this.props.node[TYPE]).includes(type)
		)
		if (type) {
			const ViewElement = View.renderers[type]
			return <ViewElement {...this.props} />
		} else {
			return <div>hi</div>
		}
	}
	static renderers = {
		["http://schema.org/Person"](props: ViewProps) {
			console.log(props.graph, props.node)
			return (
				<div>
					<h1>
						{props.node ? props.node["http://schema.org/name"] : "placeholder"}
					</h1>
					{props.node && props.node[ID]}
				</div>
			)
		},
	}
}
