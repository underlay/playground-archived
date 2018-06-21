import React from "react"
import uuid from "uuid/v4"
import { Map, List, Set as ImmutableSet } from "immutable"
import { Buffer } from "buffer"
import multihashing from "multihashing"
import multihash from "multihashes"
import niceware from "niceware"

import {
	Assertion,
	SourcedNode,
	ID,
	TYPE,
	TIME,
	VALUE,
	SOURCE,
	things,
	flattenValues,
	ancestry,
	enumerateProperties,
	GRAPH,
	CONTEXT,
	Values,
	AssertionNode,
	SourcedValues,
	SourcedInline,
	SourcedReference,
	nodes,
	LABEL,
} from "./schema"
import Select from "./select"
import ObjectView, { ObjectProps } from "./object"
// import MapView from "./views/map"
import FormView, { FormValue, Constant, Reference, Inline } from "./form"
import colors from "./views/colors"

interface UndergroundProps {
	onSubmit: (assertion: Assertion, hash: string) => void
}

interface UndergroundState {
	hash: string
	focus: string
	assertions: Map<string, Assertion>
	graph: Map<string, SourcedNode>
	forms: Map<string, Map<string, List<FormValue>>>
	properties: Map<string, List<List<string>>>
	explorer: ImmutableSet<List<string>>
}

type EntrySeq = [string, FormValue[]]

export default class Underground extends React.Component<
	UndergroundProps,
	UndergroundState
> {
	private static createCatalog: List<List<string>> = List(
		Array.from(things).map(id => List([id]))
	)
	private static generateProperties(types: string[]): List<List<string>> {
		const set: Set<string> = new Set()
		return List(
			types.reduce((props: List<List<string>>, type) => {
				return props.concat(
					Array.from(ancestry[type]).reduce(
						(props: List<List<string>>, type) =>
							props.concat(
								enumerateProperties(type)
									.filter(prop => !set.has(prop) && !!set.add(prop))
									.map(prop => List([prop, type]))
							),
						List([])
					)
				)
			}, List([]))
		)
	}
	private static key = "https://underlay.mit.edu"
	private source: string
	constructor(props) {
		super(props)
		this.state = {
			assertions: Map({}),
			hash: location.hash.slice(1),
			focus: null,
			graph: Map({}),
			forms: Map({}),
			properties: Map({}),
			explorer: ImmutableSet([]),
		}
		this.renderNode = this.renderNode.bind(this)
		this.createNode = this.createNode.bind(this)
		this.exportNode = this.exportNode.bind(this)
		this.accumulateNode = this.accumulateNode.bind(this)
		this.handleSubmit = this.handleSubmit.bind(this)
		if (localStorage.hasOwnProperty(Underground.key)) {
			this.source = localStorage[Underground.key]
		} else {
			this.source = niceware.generatePassphrase(4).join("-")
			localStorage[Underground.key] = this.source
		}
	}
	componentDidMount() {
		window.addEventListener("hashchange", event => {
			if (location.hash !== this.state.hash) {
				this.setState({ hash: location.hash.slice(1) })
			}
		})
	}
	render() {
		const { hash, graph } = this.state
		if (this.state.hash === "") {
			return this.renderGraph()
		} else if (graph.has(hash)) {
			return this.renderExplorer()
		} else {
			return (
				<div>
					<a href="#">Back to graph</a> {this.renderFileInput()}
					<p>That id doesn't exist in the graph yet :-(</p>
				</div>
			)
		}
	}
	renderFileInput() {
		return (
			<input
				type="file"
				accept="application/json"
				onChange={event => this.readFile(event)}
			/>
		)
	}
	renderExplorer() {
		const { graph, hash, explorer } = this.state
		return (
			<div>
				<a href="#">Back to graph</a> {this.renderFileInput()}
				<hr />
				{graph.has(hash) && this.renderNode(graph.get(hash), 0)}
				{explorer.toArray().map((path, key) => {
					const node = this.resolvePath(path.slice(1).toArray())
					if (node) return this.renderNode(node, key)
					else return null
				})}
			</div>
		)
	}
	renderGraph() {
		const { graph, forms } = this.state
		const disabled = forms.size === 0
		return (
			<div>
				<Select
					placeholder="Create a new object by type"
					catalog={Underground.createCatalog}
					onSubmit={this.createNode}
				>
					{this.renderFileInput()}
				</Select>
				{graph.valueSeq().map(this.renderNode)}
				<hr />
				<header>Issue a new assertion</header>
				<form onSubmit={this.handleSubmit}>
					<div className="container">
						{this.state.forms
							.keySeq()
							.filter(key => this.state.graph.has(key))
							.map(key => this.state.graph.get(key))
							.map((node, key) => (
								<FormView
									key={key}
									id={node[ID]}
									types={flattenValues(node[TYPE])}
									form={this.state.forms.get(node[ID])}
									graph={this.state.graph}
									focus={this.state.focus}
									path={[node[ID]]}
									createNode={this.createNode}
									onRemove={() => this.removeForm(node[ID])}
									onChange={(form, id, formValues) => {
										const forms = this.state.forms.set(node[ID], form)
										if (id && formValues) {
											this.setState({ forms: forms.set(id, formValues) })
										} else {
											this.setState({ forms })
										}
									}}
								/>
							))}
					</div>
					<hr />
					<input
						disabled={disabled}
						type="button"
						value="Submit"
						onClick={event => this.handleSubmit(event, true)}
					/>
					<input disabled={disabled} type="submit" value="Download" />
				</form>
				{/* <MapView objects={this.state.graph} /> */}
			</div>
		)
	}
	private resolveInlinePath(
		id: string,
		value: SourcedInline | SourcedReference,
		path: string[]
	): SourcedNode {
		if (value.hasOwnProperty(ID)) {
			return this.resolvePath([value[ID], ...path])
		} else if (path.length === 0) {
			return { [ID]: id, ...value }
		} else {
			const [prop, index, ...next] = path
			if (value.hasOwnProperty(prop)) {
				const isArray = Array.isArray(value[prop])
				const isNumber = !isNaN(+index)
				if (isArray && isNumber && +index < value[prop].length) {
					const newId = [id, nodes[prop][LABEL], index].join("/")
					return this.resolveInlinePath(newId, value[prop][index], next)
				} else if (!isArray && !isNumber) {
					const newId = [id, nodes[prop][LABEL]].join("/")
					return this.resolveInlinePath(newId, value[prop], [index, ...next])
				}
			}
		}
		return null
	}
	private resolvePath(path: string[]): SourcedNode {
		const [id, ...rest] = path
		if (this.state.graph.has(id)) {
			const node = this.state.graph.get(id)
			if (rest.length > 0) {
				const [prop, index, ...next] = rest
				if (node.hasOwnProperty(prop)) {
					const isArray = Array.isArray(node[prop])
					const isNumber = !isNaN(+index)
					if (
						isArray &&
						isNumber &&
						+index < (node[prop] as SourcedValues).length
					) {
						const value = node[prop][index]
						const newId = [id, nodes[prop][LABEL], index].join("/")
						return this.resolveInlinePath(newId, value, next)
					} else if (!isArray && !isNumber) {
						// const value = node[prop] as SourcedInline | SourcedReference
						const value = node[prop] as any
						const newId = [id, nodes[prop][LABEL]].join("/")
						return this.resolveInlinePath(newId, value, [index, ...next])
					}
				}
			} else {
				return node
			}
		}
		return null
	}
	private renderNode(node: SourcedNode, key: number) {
		const { explorer, graph, focus } = this.state
		const { [ID]: id, [TYPE]: type } = node
		const types = flattenValues(type)
		const onExplore = (path: string[]) => {
			const color = colors[Math.floor(Math.random() * colors.length)]
			const explorer = this.state.explorer.add(List([color, ...path]))
			this.setState({ explorer })
		}
		const disabled =
			this.state.hash === ""
				? this.state.forms.has(id)
				: this.state.hash === node[ID]
		const onSubmit = () => {
			const forms = this.state.forms.set(id, Map())
			const props = Underground.generateProperties(types)
			const properties = this.state.properties.set(id, props)
			this.setState({ forms, properties, focus: `${id}/` })
		}
		const properties: ObjectProps = {
			onExplore,
			className: "",
			explorer,
			node,
			graph,
			disabled,
			focus: focus === id,
			onSubmit,
			depth: 0,
			focused: focus,
			onFocus: focus => this.setState({ focus }),
		}
		if (this.state.hash !== "") {
			properties.depth = this.state.hash === id ? 0 : 1
			if (this.state.hash === id) {
				properties.depth = 0
				properties.className = "large" + " "
			} else {
				properties.depth = 1
				properties.className = "medium" + " "
			}
			properties.onExploreRemove = () => {
				const element = this.state.explorer.find(
					value =>
						value
							.slice(1)
							.toArray()
							.map(v => (nodes.hasOwnProperty(v) ? nodes[v][LABEL] : v))
							.join("/") === id
				)
				const explorer = this.state.explorer.delete(element)
				this.setState({ explorer })
			}
		}
		return <ObjectView key={key} {...properties} />
	}
	private removeForm(id: string) {
		const forms = this.state.forms.delete(id)
		const properties = this.state.properties.delete(id)
		this.setState({ forms, properties })
	}
	private createNode(type: string): string {
		const id = uuid()
		const date = new Date()
		const time = date.toISOString()
		const data = { [TIME]: time, [SOURCE]: this.source }
		const node = { [ID]: id, [TYPE]: [type] }
		const graph = this.state.graph.set(id, { ...node, ...data })
		const assertion: Assertion = {
			[ID]: id,
			[CONTEXT]: {},
			[GRAPH]: [node],
			...data,
		}
		const assertions = this.state.assertions.set(id, assertion)
		this.setState({ assertions, graph, focus: id })

		return id
	}
	private accumulateNode(acc: Map<string, Values>, elm: EntrySeq) {
		const [property, values] = elm
		const objects = values.map(formValue => {
			const { value, type, constant, reference, inline } = formValue
			const node = { [TYPE]: type }
			if (value === Constant) {
				const result = constant
					? JSON.parse(constant)
					: FormView.defaultValues.hasOwnProperty(formValue.type)
						? FormView.defaultValues[formValue.type]
						: null
				node[VALUE] = result
			} else if (value === Reference) {
				node[ID] = reference || null
			} else if (value === Inline) {
				inline
					.entrySeq()
					.map(([prop, vals]) => [prop, vals.toArray()])
					.reduce(this.accumulateNode, Map())
					.forEach((value, key) => (node[key] = value))
			}
			return node
		})
		return acc.set(property, objects as Values)
	}
	private exportNode([id, props]: [string, EntrySeq[]]): AssertionNode {
		const type = this.state.graph.get(id)[TYPE]
		const properties = props.reduce(this.accumulateNode, Map({}))
		return { [ID]: id, [TYPE]: type, ...properties.toJS() }
	}
	private handleSubmit(event, download?: boolean) {
		event.preventDefault()
		const date = new Date()
		const time = date.toISOString()
		const data = { [TIME]: time, [SOURCE]: this.source }
		const nodes = this.state.forms.map(props => props.entrySeq()).entrySeq()
		const graph = nodes.map(this.exportNode).toJS()
		const assertion: Assertion = { [CONTEXT]: {}, [GRAPH]: graph, ...data }
		const json = JSON.stringify(assertion)
		const bytes = Buffer.from(json, "utf8")
		const mhash = multihashing(bytes, "sha1")
		const hash = multihash.toB58String(mhash)
		this.importAssertion(assertion, hash)
		this.setState({ forms: Map({}), properties: Map({}) })
		if (!download) {
			this.props.onSubmit(assertion, hash)
		}
	}
	private readFile(event) {
		event.preventDefault()
		const { files } = event.target
		console.log(files)
		if (files && files.length > 0) {
			Array.from(files).forEach((file: File) => {
				const test = /^([0-9A-Za-z]+)\.json$/
				if (file.type === "application/json" && test.test(file.name)) {
					const [match, hash] = test.exec(file.name)
					if (this.state.assertions.has(hash)) {
						window.alert("You've already imported this assertion!")
					} else {
						this.importFile(hash, file)
					}
				}
			})
		}
	}
	private importFile(hash: string, file: File) {
		const reader = new FileReader()
		let data
		reader.onloadend = () => {
			const text = reader.result
			try {
				data = JSON.parse(text)
			} catch (e) {
				console.error("could not parse text", text, e)
			}
			this.importAssertion(data, hash)
		}
		reader.readAsText(file)
	}
	private importAssertion(assertion: Assertion, hash: string) {
		const assertions = this.state.assertions.set(hash, assertion)
		const graph = assertion[GRAPH].reduce((graph, node) => {
			const { [ID]: id, [TYPE]: type, ...rest } = node
			const props: { [prop: string]: SourcedValues } = {}
			Object.keys(rest).forEach(prop => {
				const values = (Array.isArray(node[prop])
					? node[prop]
					: [node[prop]]) as Values
				props[prop] = values.map(value => ({ ...value, [SOURCE]: hash }))
			})
			if (graph.has(id)) {
				const sourced = graph.get(id)
				Object.keys(props).forEach(prop => {
					if (sourced.hasOwnProperty(prop)) {
						const value = sourced[prop] as SourcedValues
						sourced[prop] = value.concat(props[prop])
					} else {
						sourced[prop] = props[prop]
					}
				})
				return graph.set(id, sourced)
			} else {
				return graph.set(id, { [ID]: id, [TYPE]: type, ...props })
			}
		}, this.state.graph)
		this.setState({ graph, assertions })
	}
}
