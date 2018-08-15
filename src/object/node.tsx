import React from "react"
import ObjectView, { ObjectProps, ObjectComponent } from "."
import { flattenValues } from "../schema"

function test(node: {}): boolean {
	return typeof node === "object"
}

const primitives = new Set(["boolean", "string", "number"])
interface NodeState {}
class NodeObject extends React.Component<ObjectProps, NodeState> {
	constructor(props: ObjectProps) {
		super(props)
	}
	render() {
		const keys = Object.keys(this.props.node)
		return (
			<table>
				<tbody>{keys.map(this.renderRow)}</tbody>
			</table>
		)
	}
	renderRow = (key: string) => {
		return (
			<tr>
				<td>{key}</td>
				<td>{this.renderValue(key)}</td>
			</tr>
		)
	}
	renderValue(key: string) {
		const { node, ipfs } = this.props
		return (
			<React.Fragment>
				{flattenValues(node[key]).map((node, key) => {
					if (primitives.has(typeof node)) {
						return (
							<span key={key} className="primitive">
								{JSON.stringify(node)}
							</span>
						)
					} else {
						return <ObjectView key={key} ipfs={ipfs} node={node} />
					}
				})}
			</React.Fragment>
		)
	}
}

export default {
	test,
	component: NodeObject,
} as ObjectComponent
