import React from "react"
import jsonld from "jsonld"
import Viz from "viz.js"
import { Module, render } from "viz.js/full.render"

const context = { "@vocab": "http://schema.org/" }

const shim = rawId => (rawId.slice(0, 2) === "_:" ? rawId.slice(2) : rawId)

function createNode(node) {
  const { "@type": type, "@id": rawId, ...rest } = node
  const id = shim(rawId)
  const lines = []
  const properties = []
  Object.keys(rest).forEach(key => {
    const val = node[key]
    if (val["@id"]) {
      const label = `[label="${key}"]`
      const target = shim(val["@id"])
      lines.push(`${id} -> ${target} ${label};`)
    } else {
      const { "@value": rawValue, "@type": type } = val
      const value = JSON.stringify(rawValue)
      const cells = [key, type, value].map(cell => `<TD>${cell}</TD>`)
      const row = `<TR>${cells.join("")}</TR>`
      properties.push(row)
    }
  })
  const header = `<TR><TD COLSPAN="3"><B>${type}</B></TD></TR>`
  const table = `<TABLE CELLSPACING="0">${header}${properties.join("")}</TABLE>`
  lines.push(`${id} [label=<${table}>];`)
  return lines.join("\n")
}

interface DotProps {
  graph: {}
}

interface DotState {
  dot: string
}

export default class DotGraph extends React.Component<DotProps, DotState> {
  private div: HTMLDivElement
  private viz: any
  constructor(props) {
    super(props)
    this.viz = new Viz({ Module, render })
  }
  componentDidMount() {
    if (this.div) {
      jsonld.flatten(this.props.graph, context, (err, flattened) => {
        if (err) return console.error(err)
        const nodes = flattened["@graph"].map(createNode)
        const string = `digraph {\nnode [shape=plain];\n${nodes.join("\n")}\n}`
        this.viz
          .renderSVGElement(string)
          .then(element => this.div.appendChild(element))
      })
    }
  }
  attach = div => (this.div = div)
  render() {
    return <div ref={this.attach} className="dot" />
  }
}
