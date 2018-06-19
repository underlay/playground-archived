import React from "react"
import uuid from "uuid/v4"
import { Map, List } from "immutable"
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
} from "./schema"
import Select from "./select"
import ObjectView from "./object"
// import MapView from "./views/map"
import FormView, { FormValue, Constant, Reference, Inline } from "./form"

interface UndergroundProps {
	onSubmit: (assertion: Assertion, hash: string) => void
}

interface UndergroundState {
	objects: boolean
	focus: string
	assertions: Map<string, Assertion>
	graph: Map<string, SourcedNode>
	forms: Map<string, Map<string, List<FormValue>>>
	properties: Map<string, List<List<string>>>
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
			objects: true,
			focus: null,
			graph: Map({}),
			forms: Map({}),
			properties: Map({}),
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

	render() {
		const disabled = this.state.graph.size === 0
		return (
			<div>
				<Select
					placeholder="Create a new object by type"
					catalog={Underground.createCatalog}
					onSubmit={this.createNode}
				>
					<input
						type="file"
						accept="application/json"
						onChange={event => this.readFile(event)}
					/>
					<input
						type="checkbox"
						checked={this.state.objects}
						onChange={({ target: { checked: objects } }) =>
							this.setState({ objects })
						}
					/>
				</Select>

				{this.state.objects && this.state.graph.valueSeq().map(this.renderNode)}
				<hr />
				<header>Issue a new assertion</header>
				<form onSubmit={this.handleSubmit}>
					<div className="container">
						{this.state.forms
							.keySeq()
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
					<input disabled={disabled} type="submit" value="Download" />
				</form>
				{/* <MapView objects={this.state.graph} /> */}
			</div>
		)
	}
	private renderNode(node: SourcedNode, key: number) {
		const { [ID]: id, [TYPE]: type } = node
		const types = flattenValues(type)
		return (
			<ObjectView
				key={key}
				node={node}
				graph={this.state.graph}
				focus={this.state.focus === id}
				disabled={this.state.forms.has(id)}
				onSubmit={() => {
					const forms = this.state.forms.set(id, Map())
					const props = Underground.generateProperties(types)
					const properties = this.state.properties.set(id, props)
					this.setState({ forms, properties, focus: `${id}/` })
				}}
			/>
		)
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
					: this.defaultValues.hasOwnProperty(formValue.type)
						? this.defaultValues[formValue.type]
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
	private handleSubmit(event) {
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
		this.props.onSubmit(assertion, hash)
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
	private defaultValues = {
		"http://schema.org/Boolean": false,
	}
	private defaultValue = ""
}
