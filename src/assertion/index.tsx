import React from "react"
import { AssertionGraph } from "../schema/types"
import { GRAPH, CONTEXT } from "../utils/constants"

import Dot from "./dot"

interface AssertionProps {
	hash: string
	ipfs: ipfs
}
interface AssertionState {
	value: AssertionGraph
	error: string
}

export default class Assertion extends React.Component<
	AssertionProps,
	AssertionState
> {
	constructor(props) {
		super(props)
		this.state = { value: null, error: null }
	}
	componentDidMount() {
		const { ipfs, hash } = this.props
		ipfs.dag
			.get(hash)
			.then(({ value }) => this.setState({ value }))
			.catch(error => this.setState({ error }))
	}
	render() {
		const { value, error } = this.state
		if (value) {
			const { [GRAPH]: graph, [CONTEXT]: context } = value
			return <Dot context={context} graph={value} />
		} else if (error) {
			return <p className="error">{error.toString()}</p>
		} else return null
	}
}
