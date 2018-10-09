import React from "react"
import ReactDOMServer from "react-dom/server"

import { AssertionGraph } from "../schema/types"

import jsonld from "jsonld"
import { getInitialContext, process } from "jsonld/lib/context"
import { compactIri } from "jsonld/lib/compact"

import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"
// import label from "cytoscape-node-html-label"
import label from "../../../cytoscape-node-html-label/dist/cytoscape-node-html-label.min"
import bilkent from "cytoscape-cose-bilkent"

cytoscape.use(dagre)
cytoscape.use(label)
cytoscape.use(bilkent)

import { style, labelStyle, layoutOptions } from "./style.js"
import { NodeView, getTableId, getContainerId } from "./node.jsx"
import { testType } from "../signatures"
import PanelView from "./panel.jsx"

function initializeElements(node, elements, map, parent) {
	const { "@id": id, "@graph": graph } = node
	map[id] = node
	const element = {
		group: "nodes",
		data: { id, shape: "rectangle" },
	}

	elements.push(element)
	if (parent !== null) (element.data as any).parent = parent
	if (Array.isArray(graph)) {
		graph.forEach(node => initializeElements(node, elements, map, id))
	}
}

function attachEdges(node, elements, map, compact) {
	const {
		"@id": source,
		"@graph": graph,
		"@type": type,
		"@index": _,
		...properties
	} = node
	Object.keys(properties).forEach(property => {
		const values = node[property]
		values.forEach(({ "@list": list, "@id": target }, index) => {
			if (Array.isArray(list)) {
				// TODO: Something
			} else if (map.hasOwnProperty(target)) {
				const name = compact(property, true)
				const id = JSON.stringify([source, property, index])
				const data = { id, property, name, source, target }
				elements.push({ group: "edges", data })
			}
		})
	})
	if (Array.isArray(graph))
		graph.forEach(node => attachEdges(node, elements, map, compact))
}

function assembleHTML(node, nodes, edges, compact) {
	const props = { node, nodes, edges, compact }
	const element = <NodeView {...props} />
	return ReactDOMServer.renderToStaticMarkup(element)
}

interface AssertionProps {
	hash: string
	ipfs: ipfs
}
interface AssertionState {
	value: AssertionGraph
	flattened: any
	ctx: any
	error: string
}

export default class Assertion extends React.Component<
	AssertionProps,
	AssertionState
> {
	content: HTMLDivElement
	constructor(props) {
		super(props)
		this.state = { value: null, flattened: null, ctx: null, error: null }
	}
	componentDidMount() {
		const { ipfs, hash } = this.props
		const base = `dweb:/ipld/${hash}`
		ipfs.dag
			.get(hash)
			.then(async ({ value }) => {
				const flattened = await jsonld.flatten(value, null)
				const activeCtx = getInitialContext({ base })
				const ctx = process({ activeCtx, localCtx: value["@context"] || {} })
				this.setState({ value, flattened, ctx })
				this.renderGraph(flattened, ctx)
			})
			.catch(error => this.setState({ error }))
	}
	renderGraph(flattened, ctx) {
		const compact = (iri, vocab) =>
			compactIri({ activeCtx: ctx, iri, relativeTo: { vocab: !!vocab } })

		const elements = []
		const nodes = {}
		const collapsedEdges = {}
		const nonSignatures = flattened.filter(node => !testType(node))
		nonSignatures.forEach(node =>
			initializeElements(node, elements, nodes, null)
		)
		nonSignatures.forEach(node => attachEdges(node, elements, nodes, compact))

		const tpl = data =>
			assembleHTML(nodes[data.id], nodes, collapsedEdges, compact)

		const cy = cytoscape({ container: this.content, elements, style })
		cy.nodeHtmlLabel([{ tpl }, { tpl, query: ":parent", ...labelStyle }])
		cy.one("render", () => {
			cy.edges().on("select", evt => {
				evt.target.unselect()
				const [id, property, index] = JSON.parse(evt.target.id())
				const { source } = evt.target.data()
				if (!collapsedEdges.hasOwnProperty(id)) collapsedEdges[id] = {}
				if (!collapsedEdges[id].hasOwnProperty(property))
					collapsedEdges[id][property] = {}
				collapsedEdges[id][property][index] = evt.target.remove()
				const containerId = getContainerId(id)
				const container = document.getElementById(containerId)
				const node = nodes[source]
				container.innerHTML = assembleHTML(node, nodes, collapsedEdges, compact)
			})
			cy.nodes().forEach(ele => {
				const id = ele.id()
				const tableId = getTableId(id)
				const { parentElement } = document.getElementById(tableId)
				const { offsetWidth, offsetHeight } = parentElement
				parentElement.id = getContainerId(id)
				parentElement.classList.add("node-container")
				if (ele.isParent()) {
					parentElement.classList.add("compound-node-container")
				}
				ele.style("width", offsetWidth)
				ele.style("height", offsetHeight)
			})
			cy.layout(layoutOptions).run()
		})
	}
	render() {
		const { ipfs, hash } = this.props
		const { value, flattened, ctx, error } = this.state
		if (value) {
			const base = `dweb:/ipld/${hash}`
			return (
				<main className="view">
					<div id="panel">
						<PanelView
							ipfs={ipfs}
							base={base}
							flattened={flattened}
							ctx={ctx}
						/>
					</div>
					<div id="content" ref={div => (this.content = div)} />
				</main>
			)
		} else if (error) {
			return <p className="error">{error.toString()}</p>
		} else return null
	}
}
