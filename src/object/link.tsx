import React from "react"
import { ObjectProps, ObjectComponent } from "."

function test(node: {}): boolean {
	return (
		typeof node === "object" &&
		Object.keys(node).length === 2 &&
		node["@index"] &&
		node["@value"]
	)
}
interface LinkState {
	expanded: boolean
}
class LinkObject extends React.Component<ObjectProps, LinkState> {
	constructor(props: ObjectProps) {
		super(props)
	}
}

export default {
	test,
	component: LinkObject,
} as ObjectComponent
