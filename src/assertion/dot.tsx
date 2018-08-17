import React from "react"
import jsonld from "jsonld"
import Viz from "viz.js"
import { Module, render } from "viz.js/full.render"

const rootContext = { "@version": 1.1, "@vocab": "http://schema.org/" }

const shim = rawId => `"${rawId.slice(0, 2) === "_:" ? rawId.slice(2) : rawId}"`
const entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
}

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s])
}

function createNode(node) {
  const { "@type": type, "@id": rawId, ...rest } = node
  const id = shim(rawId)
  const lines = []
  const properties = []
  Object.keys(rest).forEach(key => {
    const v = node[key].hasOwnProperty("@list") ? node[key]["@list"] : node[key]
    const array = Array.isArray(v) ? v : [v]
    array.forEach(val => {
      if (val["@id"]) {
        const label = `[label="${key}"]`
        const target = shim(val["@id"])
        lines.push(`${id} -> ${target} ${label};`)
      } else {
        const { "@value": rawValue, "@type": type, "@index": index } = val
        const href = i => {
          if (i === 2) {
            if (type === "URL") return ` HREF="${rawValue}"`
            else if (index === "/")
              return ` HREF="https://gateway.ipfs.io/ipfs/${rawValue}"`
          }
          return ""
        }
        const value = escapeHtml(
          type === "URL" || index === "/"
            ? rawValue
            : JSON.stringify(
                type === "Text" && rawValue.length > 103
                  ? rawValue.slice(0, 100) + "..."
                  : rawValue
              )
        )
        // const value = escapeHtml(
        //   JSON.stringify(
        //     type === "Text" && rawValue.length > 103
        //       ? rawValue.slice(0, 100) + "..."
        //       : rawValue
        //   )
        // )
        const cells = [key, index === "/" ? "Link" : type, value].map(
          (cell, i) =>
            `<TD${href(i)}>${Array.isArray(cell) ? cell.join(", ") : cell}</TD>`
        )
        const row = `<TR>${cells.join("")}</TR>`
        properties.push(row)
      }
    })
  })
  const header = `<TR><TD COLSPAN="3"><B>${
    Array.isArray(type) ? type.join(", ") : type
  }</B></TD></TR>`
  const href = rawId.slice(0, 2) === "_:" ? "" : ` HREF=${id}`
  const props = properties.join("")
  const table = `<TABLE${href} CELLSPACING="0">${header}${props}</TABLE>`
  lines.push(`${id} [label=<${table}>];`)
  return lines.join("\n")
}

interface DotProps {
  graph: {}
  context: {}
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
      const context = Object.assign(
        Object.assign({}, rootContext),
        this.props.context
      )
      console.log("context", context)
      console.log("graph", this.props.graph)
      jsonld.flatten(this.props.graph, context, (err, flattened) => {
        if (err) return console.error(err)
        console.log("flattened", flattened)
        const array = Array.isArray(flattened) ? flattened : flattened["@graph"]
        const nodes = array.map(createNode)
        const layout = array.length > 30 ? "fdp" : "dot"
        const prefix = ["node [shape=plain];", `graph [layout=${layout}];`]
        const string = `digraph {\n${prefix.join("\n")}\n${nodes.join("\n")}\n}`
        console.log("string", string)
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
