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

function trimText(string) {
  const length = Math.ceil(string.length / 100)
  const lines = Array.from({ length }).map((_, i) =>
    string.slice(i * 100, (i + 1) * 100)
  )
  for (let i = 0; i < length - 1; i++) {
    const index = lines[i].lastIndexOf(" ")
    if (index >= 0) {
      const rest = lines[i].slice(index + 1)
      lines[i + 1] = rest + lines[i + 1]
      lines[i] = lines[i].slice(0, index)
    }
  }
  return lines.map(escapeHtml).join(" <BR /> ")
}

function createNode(node) {
  const { "@type": type, "@id": rawId, ...rest } = node
  const id = shim(rawId)
  const lines = []
  const properties = []
  let contentUrl = null
  console.log("wow", node)
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
        const value =
          type === "URL" || index === "/"
            ? escapeHtml(rawValue)
            : type === "Text" && rawValue.length > 100
              ? trimText(rawValue)
              : escapeHtml(rawValue)

        const cells = [key, index === "/" ? "Link" : type, value].map(
          (cell, i) =>
            `<TD${href(i)}>${Array.isArray(cell) ? cell.join(", ") : cell}</TD>`
        )
        if (key === "contentUrl") {
          contentUrl = `https://gateway.ipfs.io/ipfs/${rawValue}`
        }
        const row = `<TR>${cells.join("")}</TR>`
        properties.push(row)
      }
    })
  })
  const typeArray = Array.isArray(type) ? type : [type]
  const header = `<TR><TD COLSPAN="3"><B>${typeArray.join(", ")}</B></TD></TR>`
  const href = rawId.slice(0, 2) === "_:" ? "" : ` HREF=${id}`
  // if (contentUrl !== null) {
  //   properties.push(
  //     `<TR><TD COLSPAN="3" HREF="${contentUrl}"><IMG SRC="${contentUrl}"/></TD></TR>`
  //   )
  // }
  const props = properties.join("")
  const table = `<TABLE${href} CELLSPACING="0">${header}${props}</TABLE>`
  const style = [`label=<${table}>`]
  if (typeArray.includes("prov:Entity")) {
    style.push("style=filled")
    style.push("shape=oval")
    style.push('color="#FFFC87"')
  } else if (
    typeArray.includes("prov:SoftwareAgent") ||
    typeArray.includes("prov:Person")
  ) {
    style.push("style=filled")
    style.push("shape=house")
    style.push('color="#FDB266"')
  } else if (typeArray.includes("prov:Activity")) {
    style.push("style=filled")
    style.push("shape=box")
    style.push('color="#9FB1FC"')
  }
  lines.push(`${id} [${style.join(", ")}];`)
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
        const nodes = []
        array.forEach(({ "@graph": graph, ...n }) => {
          nodes.push(createNode(n))
          if (graph) {
            nodes.push(
              `\nsubgraph cluster_${n["@id"].slice(2)} {\ncolor=black;\n`
            )
            graph.map(createNode).forEach(node => nodes.push(node))
            nodes.push("\n}\n")
          }
        })
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
