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

interface UndergroundState {
	focus: string
	graph: List<Node>
	forms: Map<string, Map<string, List<string>>>
	objects: Map<string, string>
	properties: Map<string, List<List<string>>>
}

type Value = string | number | boolean
type Constant = { "@type": string; "@value": Value }
type Reference = { "@type": string; "@id": string }
type EntrySeq = [string, [string, string]]

export default class Underground extends React.Component<
	UndergroundProps,
	UndergroundState
> {
	private static createCatalog: List<List<string>> = List(
		Array.from(things).map(id => List([id]))
	)
	private static generateProperties(type: string): List<List<string>> {
		return List(
			enumerateAncestry(type).reduce(
				(acc: List<List<string>>, type: string) =>
					acc.concat(
						enumerateProperties(type).map(property => List([property, type]))
					),
				List()
			)
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
				/>
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
	private renderObject([id, type]: [string, string], key: number) {
		return (
			<ObjectView
				key={key}
				id={id}
				types={[type]}
				focus={this.state.focus === id}
				disabled={this.state.forms.has(id)}
				onSubmit={() => {
					const graph = this.state.graph.push({ "@id": id, "@type": type })
					const forms = this.state.forms.set(id, Map())
					const props = Underground.generateProperties(type)
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
						const path = [id, property]
						const forms = this.state.forms.setIn(path, List([type, value]))
						const focus = [id, property].join("/")
						this.setState({ forms, focus })
					}}
				/>
				<hr />
				<table>
					<tbody>
						{this.state.forms.get(id).size > 0 ? (
							this.state.forms
								.get(id)
								.entrySeq()
								.map(([property, entry], key) =>
									this.renderProperty(id, [property, entry], key)
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
		[property, entry]: [string, List<string>],
		key: number
	) {
		const range = flattenValues(nodes[property][RANGE])
		return (
			<tr key={key}>
				<td>{nodes[property]["rdfs:label"]}</td>
				<td>
					<select
						value={entry.get(0)}
						disabled={range.length === 1}
						onChange={({ target: { value } }) => {
							if (value !== entry.get(0)) {
								const path = [id, property]
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
				<td>{this.renderValue(id, property, entry)}</td>
				<td>
					<input
						type="button"
						value="Remove"
						onClick={event => {
							const path = [id, property]
							const forms = this.state.forms.deleteIn(path)
							this.setState({ forms })
						}}
					/>
				</td>
			</tr>
		)
	}
	private renderValue(id: string, property: string, entry: List<string>) {
		const {
			createObject,
			state: { objects },
		} = this
		const autoFocus = this.state.focus === [id, property].join("/")
		return (
			<PropertyView
				{...{ autoFocus, entry, objects, createObject }}
				onChange={entry => {
					const forms = this.state.forms.setIn([id, property], entry)
					this.setState({ forms })
				}}
			/>
		)
	}
	private createObject(type: string): string {
		const id = uuid()
		const objects = this.state.objects.set(id, type)
		this.setState({ objects, focus: id })
		return id
	}
	private accumulateNode(
		acc,
		elm: EntrySeq
	): Map<string, Constant | Reference> {
		const [property, [type, value]] = elm
		const object: Constant | Reference = types.hasOwnProperty(type)
			? {
					[TYPE]: type,
					[VALUE]: value
						? JSON.parse(value)
						: this.defaultValues.hasOwnProperty(type)
							? this.defaultValues[type]
							: null,
			  }
			: { [TYPE]: type, [ID]: value || null }
		return acc.set(property, object)
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
	private defaultValues = {
		"http://schema.org/Boolean": false,
	}
	private defaultValue = ""
}
