import React from "react"
import ReactJson from "react-json-view"
import { AssertionGraph } from "../schema/types"
import { GRAPH, CONTEXT } from "../utils/constants"

import Dot from "./dot"

interface AssertionProps {
  hash: string
  ipfs: ipfs
  assertion?: AssertionGraph
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
    const { assertion } = props
    this.state = { value: assertion, error: null }
  }
  componentDidMount() {
    if (this.state.value) return
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
      return (
        <div className="meta">
          <ReactJson
            style={{ flexGrow: 1 }}
            displayDataTypes={false}
            enableClipboard={false}
            src={graph}
          />
          <Dot context={context} graph={graph} />
        </div>
      )
    } else if (error) {
      return <p className="error">{error.toString()}</p>
    } else return null
  }
}
