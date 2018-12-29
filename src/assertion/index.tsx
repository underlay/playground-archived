import React from "react"
import ReactDOMServer from "react-dom/server"

import { AssertionGraph } from "../schema/types"

import jsonld from "jsonld"
import { getInitialContext, process } from "jsonld/lib/context"
import { compactIri } from "jsonld/lib/compact"

import cytoscape from "cytoscape"
import label from "cytoscape-node-html-label"
import bilkent from "cytoscape-cose-bilkent"

cytoscape.use(label)
cytoscape.use(bilkent)

import { style, labelStyle, layoutOptions } from "./style"
import { NodeView, getNodeId, getTableId, getContainerId } from "./node"
import { testType } from "../signatures"
import PanelView from "./panel"

function initializeElements(node, elements, map, parent) {
	const { "@graph": graph } = node
	const id = getNodeId(node, parent)
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

function attachEdges(node, parent, elements, map, compact) {
	const {
		"@id": id,
		"@graph": graph,
		"@type": type,
		"@index": _,
		...properties
	} = node
	const source = getNodeId(node, parent)
	Object.keys(properties).forEach(property => {
		const values = node[property]
		values.forEach((value, index) => {
			const { "@list": list, "@id": id } = value
			const target = id ? getNodeId(value, parent) : null
			if (Array.isArray(list)) {
				// TODO: Something
			} else if (map.hasOwnProperty(target)) {
				const name = compact(property, true)
				const id = JSON.stringify([source, property, index])
				const data = { id, property, name, source, target, parent }
				elements.push({ group: "edges", data })
			}
		})
	})
	if (Array.isArray(graph))
		graph.forEach(node => attachEdges(node, source, elements, map, compact))
}

function assembleHTML(node, parent, nodes, edges, compact) {
	const props = { node, parent, nodes, edges, compact }
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
		nonSignatures.forEach(node =>
			attachEdges(node, null, elements, nodes, compact)
		)

		const tpl = data =>
			assembleHTML(nodes[data.id], data.parent, nodes, collapsedEdges, compact)

		const cy = cytoscape({ container: this.content, elements, style })
		cy.nodeHtmlLabel([{ tpl }, { tpl, query: ":parent", ...labelStyle }])
		cy.one("render", () => {
			// cy.edges().on("select", evt => {
			// 	evt.target.unselect()
			// 	const [id, property, index] = JSON.parse(evt.target.id())
			// 	const { source, parent } = evt.target.data()
			// 	if (!collapsedEdges.hasOwnProperty(id)) collapsedEdges[id] = {}
			// 	if (!collapsedEdges[id].hasOwnProperty(property))
			// 		collapsedEdges[id][property] = {}
			// 	collapsedEdges[id][property][index] = evt.target.remove()
			// 	const containerId = getContainerId(id)
			// 	const container = document.getElementById(containerId)
			// 	const node = nodes[source]
			// 	container.innerHTML = assembleHTML(
			// 		node,
			// 		parent,
			// 		nodes,
			// 		collapsedEdges,
			// 		compact
			// 	)
			// })
			cy.nodes().forEach(ele => {
				const id = ele.id()
				const tableId = getTableId(id)
				const table = document.getElementById(tableId)
				const { parentElement } = table
				const { offsetWidth, offsetHeight } = parentElement
				parentElement.id = getContainerId(id)
				parentElement.classList.add("node-container")
				if (ele.isParent()) {
					parentElement.classList.add("compound-node-container")
				}
				ele.style("width", offsetWidth)
				ele.style("height", offsetHeight)

				if (
					table.firstElementChild.lastElementChild.classList.contains("object")
				) {
					const object =
						table.firstElementChild.lastElementChild.firstElementChild
							.firstElementChild
					object.setAttribute("width", (offsetWidth - 6).toString())
				}
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
