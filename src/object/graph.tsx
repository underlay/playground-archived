import React from "react"
import ObjectView, { ObjectProps, ObjectComponent } from "."
import jsonld from "jsonld"

const properties = new Set(["@context", "@graph", "@id"])
const predicate = key => properties.has(key)
function test(node: {}): boolean {
  const keys = Object.keys(node)
  return typeof node === "object" && keys.length && keys.every(predicate)
}

interface GraphState {
  flattened: {}[]
}

class GraphObject extends React.Component<ObjectProps, GraphState> {
  constructor(props: ObjectProps) {
    super(props)
    this.state = { flattened: null }
  }
  componentDidMount() {
    const graph = this.props.node["@graph"]
    const context = this.props.node["@context"]
    jsonld.flatten(graph, context, (err, flattened) => {
      if (err) console.error(err)
      else this.setState({ flattened })
    })
  }
  render() {
    const label = this.props.node["@id"]
    return (
      <fieldset>
        <legend>{label}</legend>
        {this.renderMap()}
      </fieldset>
    )
  }
  renderMap() {
    const { ipfs } = this.props
    if (this.state.flattened === null) return null
    return this.state.flattened
      .map((node, key) => ({ ipfs, node, key }))
      .map(props => <ObjectView {...props} />)
  }
}

export default {
  test,
  component: GraphObject,
} as ObjectComponent
