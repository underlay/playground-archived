import React from "react"
import uuid from "uuid/v4"
import { Map, List } from "immutable"

import {
	Node,
	ID,
	TYPE,
	VALUE,
	LABEL,
	RANGE,
	things,
	nodes,
	flattenValues,
	enumerateAncestry,
	enumerateProperties,
} from "./schema"
import Select from "./select"
import ObjectView from "./object"
import PropertyView, { types } from "./property"

interface UndergroundProps {
	onSubmit: (graph: { "@graph": Node[] }) => void
}

type Forms = Map<string, Map<string, List<List<string>>>>
interface UndergroundState {
	focus: string
	graph: List<Node>
	forms: Forms
	objects: Map<string, List<string>>
	properties: Map<string, List<List<string>>>
}

type Value = string | number | boolean
type Constant = { "@type": string; "@value": Value }
type Reference = { "@type": string; "@id": string }
type EntrySeq = [string, [string, string][]]

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
				const ancestry = enumerateAncestry(type)
				return props.concat(
					ancestry.reduce(
						(props: List<List<string>>, type) =>
							props.concat(
								enumerateProperties(type)
									.filter(prop => {
										if (set.has(prop)) return false
										set.add(prop)
										return true
									})
									.map(prop => List([prop, type]))
							),
						List([])
					)
				)
			}, List([]))
		)
	}
	private enter: boolean
	constructor(props) {
		super(props)
		this.state = {
			focus: null,
			graph: List([]),
			forms: Map({}),
			objects: Map({}),
			properties: Map({}),
		}
		this.renderNode = this.renderNode.bind(this)
		this.renderObject = this.renderObject.bind(this)
		this.createObject = this.createObject.bind(this)
		this.handleSubmit = this.handleSubmit.bind(this)
	}
	render() {
		const disabled = this.state.graph.size === 0
		return (
			<div>
				<Select
					placeholder="Create a new object by type"
					catalog={Underground.createCatalog}
					onSubmit={this.createObject}
				>
					<input
						type="file"
						accept="application/json"
						onChange={event => this.readFile(event)}
					/>
				</Select>

				{this.state.objects.entrySeq().map(this.renderObject)}
				<hr />
				<header>Issue a new assertion</header>
				<form onSubmit={this.handleSubmit}>
					<div className="container">
						{this.state.graph.map(this.renderNode)}
					</div>
					<hr />
					<input disabled={disabled} type="submit" value="Download" />
				</form>
			</div>
		)
	}
	private renderObject([id, types]: [string, List<string>], key: number) {
		return (
			<ObjectView
				key={key}
				id={id}
				types={types.toJS()}
				focus={this.state.focus === id}
				disabled={this.state.forms.has(id)}
				onSubmit={() => {
					const graph = this.state.graph.push({
						"@id": id,
						"@type": types.toJS(),
					})
					const forms = this.state.forms.set(id, Map())
					const props = Underground.generateProperties(types.toJS())
					const properties = this.state.properties.set(id, props)
					this.setState({ graph, forms, properties, focus: `${id}/` })
				}}
			/>
		)
	}
	private removeNode(id: string, key: number) {
		const graph = this.state.graph.delete(key)
		const forms = this.state.forms.delete(id)
		const properties = this.state.properties.delete(id)
		this.setState({ graph, forms, properties })
	}
	private renderNode(node: Node, key: number) {
		const id = node["@id"]
		const catalog = this.state.properties.get(id)
		return (
			<div className="node" key={key}>
				<h3>{id}</h3>
				{flattenValues(node["@type"])
					.map(type => nodes[type][LABEL])
					.join(", ")}
				<input
					value="Remove"
					type="button"
					// This also fires on enter, anywhere in the form, for some reason
					onClick={event => this.removeNode(id, key)}
				/>
				<hr />
				<Select
					placeholder="Search for a property"
					catalog={catalog}
					onSubmit={property => {
						const [type] = flattenValues(nodes[property][RANGE])
						const value = this.defaultValues.hasOwnProperty(type)
							? this.defaultValues[type]
							: this.defaultValue
						if (this.state.forms.get(id).has(property)) {
							const v = this.state.forms
								.get(id)
								.get(property)
								.push(List([type, value]))
							const forms = this.state.forms.setIn([id, property], v)
							const focus = [id, property, v.size - 1].join("/")
							this.setState({ forms, focus })
						} else {
							const v = List([List([type, value])])
							const forms = this.state.forms.setIn([id, property], v)
							const focus = [id, property, 0].join("/")
							this.setState({ forms, focus })
						}
					}}
				/>
				<hr />
				<table>
					<tbody>
						{this.state.forms.get(id).size > 0 ? (
							this.state.forms
								.get(id)
								.entrySeq()
								.map(([property, entries], key) =>
									this.renderProperty(id, [property, entries], key)
								)
						) : (
							<tr>
								<td>Select properties above to enter values</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		)
	}
	private renderProperty(
		id: string,
		[property, entries]: [string, List<List<string>>],
		key: number
	) {
		const range = flattenValues(nodes[property][RANGE])
		return entries.map((entry, index) => (
			<tr key={`${key}/${index}`}>
				{index === 0 && (
					<td rowSpan={entries.size}>{nodes[property]["rdfs:label"]}</td>
				)}
				<td>
					<select
						value={entry.get(0)}
						disabled={range.length === 1}
						onChange={({ target: { value } }) => {
							if (value !== entry.get(0)) {
								const path = [id, property, index]
								const val = List([value, null])
								const forms = this.state.forms.setIn(path, val)
								this.setState({ forms })
							}
						}}
					>
						{range.map((type, key) => (
							<option key={key} value={type}>
								{nodes[type]["rdfs:label"]}
							</option>
						))}
					</select>
				</td>
				<td>{this.renderValue(id, property, index, entry)}</td>
				<td>
					<input
						type="button"
						value="Remove"
						onClick={event => {
							const path = [id, property, index]
							const forms = this.state.forms.deleteIn(path)
							if (forms.get(id).get(property).size) {
								this.setState({ forms })
							} else {
								const forms = this.state.forms.deleteIn([id, property])
								this.setState({ forms })
							}
						}}
					/>
				</td>
			</tr>
		))
	}
	private renderValue(
		id: string,
		property: string,
		index: number,
		entry: List<string>
	) {
		const {
			createObject,
			state: { objects },
		} = this
		const autoFocus = this.state.focus === [id, property, index].join("/")
		return (
			<PropertyView
				{...{ autoFocus, entry, objects, createObject }}
				onChange={entry => {
					const forms = this.state.forms.setIn([id, property, index], entry)
					this.setState({ forms })
				}}
			/>
		)
	}
	private createObject(type: string): string {
		const id = uuid()
		const objects = this.state.objects.set(id, List([type]))
		this.setState({ objects, focus: id })
		return id
	}
	private accumulateNode(
		acc,
		elm: EntrySeq
	): Map<string, (Constant | Reference)[]> {
		const [property, values] = elm
		const objects = values.map(
			([type, value]) =>
				types.hasOwnProperty(type)
					? {
							[TYPE]: type,
							[VALUE]: value
								? JSON.parse(value)
								: this.defaultValues.hasOwnProperty(type)
									? this.defaultValues[type]
									: null,
					  }
					: { [TYPE]: type, [ID]: value || null }
		)
		return acc.set(property, objects)
	}
	private exportNode({ [ID]: id, [TYPE]: type }: Node) {
		const properties = this.state.forms.get(id).entrySeq()
		return {
			[ID]: id,
			[TYPE]: type,
			...properties
				.reduce((acc, elm: EntrySeq) => this.accumulateNode(acc, elm), Map())
				.toJS(),
		}
	}
	private handleSubmit(event) {
		event.preventDefault()
		const graph: Node[] = this.state.graph
			.map(node => this.exportNode(node))
			.toJS()
		this.props.onSubmit({ "@graph": graph })
	}
	private readFile(event) {
		event.preventDefault()
		const { files } = event.target
		console.log(files)
		if (files && files.length > 0) {
			Array.from(files).forEach((file: Blob) => {
				const reader = new FileReader()
				reader.onloadend = () => {
					let data
					try {
						data = JSON.parse(reader.result)
						this.importAssertion(data)
					} catch (e) {
						console.error("could not parse file", e)
					}
					console.log(data)
				}
				reader.readAsText(file)
			})
		}
	}
	private parseProperty(values: (Constant | Reference)[]): List<List<string>> {
		return List(
			values.map(node => {
				if (node.hasOwnProperty("@value")) {
					const { "@type": type, "@value": value } = node as Constant
					return List([type, JSON.stringify(value)])
				} else {
					const { "@type": type, "@id": id } = node as Reference
					return List([type, id])
				}
			})
		)
	}
	private importAssertion(data) {
		const graph: Node[] = data["@graph"]
		const state = graph.reduce(
			(state: UndergroundState, node: Node): UndergroundState => {
				const { "@id": id, "@type": types, ...rest } = node
				const realTypes = flattenValues(types)
				const props = rest as { [key: string]: (Constant | Reference)[] }
				const properties: Set<string> = new Set()
				Object.keys(props).forEach(property => properties.add(property))
				state.objects = state.objects.set(id, List(realTypes))
				state.forms = state.forms.set(
					id,
					Map(
						Object.keys(props)
							.filter(key => key !== ID && key !== TYPE)
							.map(property => [property, this.parseProperty(props[property])])
					)
				)
				state.properties = state.properties.set(
					id,
					Underground.generateProperties(realTypes)
				)
				state.graph = state.graph.push(node)
				return state
			},
			this.state
		)
		this.setState(state)
	}
	private defaultValues = {
		"http://schema.org/Boolean": false,
	}
	private defaultValue = ""
}
