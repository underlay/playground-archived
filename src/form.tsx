import React, { Fragment } from "react"
import { Map, List, Record } from "immutable"
import { LABEL, RANGE, SUBCLASS, SUBPROPERTY } from "./schema/constants"
import {
	flattenValues,
	nodes,
	enumerateProperties,
	enumerateAncestry,
	searchAncestry,
	propertyInheritance,
} from "./schema"
import Select from "./select"
import PropertyView from "./property"
import { constants } from "./constants"

export enum FormValueType {
	Constant = "constant",
	Reference = "reference",
	Inline = "inline",
}

export const { Constant, Reference, Inline } = FormValueType

interface FormValueParams {
	type: string
	value: FormValueType
	constant: string
	reference: string
	inline: FormValues
}

export class FormValue extends Record({
	type: null,
	value: null,
	constant: null,
	reference: null,
	inline: null,
}) {
	type: string
	value: FormValueType
	constant: string
	reference: string
	inline: FormValues
	constructor(params?: Partial<FormValueParams>) {
		params ? super(params) : super()
	}
	with(values: Partial<FormValueParams>) {
		return this.merge(values) as this
	}
}

export type FormValues = Map<string, List<FormValue>>

export interface FormProps {
	id: string
	form: FormValues
	createNode: (types: string[]) => string
	graph: Map<string, string[]>
	onRemove?: () => void
	onChange: (form: FormValues, newId?: string, newForm?: FormValues) => void
}

interface FormState {
	focus: string
}

export default class FormView extends React.Component<FormProps, FormState> {
	public static defaultValues = { "http://schema.org/Boolean": false }
	public static defaultValue = ""
	private static generateProperties(types: string[]): List<List<string>> {
		const set: Set<string> = new Set()
		const props = types.reduce((props: List<List<string>>, type) => {
			return props.concat(
				enumerateAncestry(type, SUBCLASS).reduce(
					(props: List<List<string>>, type) => {
						const filter = (prop: string) => !set.has(prop) && !!set.add(prop)
						const properties = enumerateProperties(type).filter(filter)
						return props.concat(properties.map(prop => List([prop, type])))
					},
					List([])
				)
			)
		}, List([]))
		return List(props)
	}
	constructor(props: FormProps) {
		super(props)
		this.state = {
			focus: null,
		}
		this.renderProperty = this.renderProperty.bind(this)
	}
	render() {
		const { id, graph, onChange, onRemove, form } = this.props
		const catalog = FormView.generateProperties(graph.get(id))
		return (
			<div className="form">
				<h3 className="mono">{id}</h3>
				{graph.get(id).map((type, key) => (
					<Fragment key={key}>
						{key ? ", " : null}
						<span className="mono">{nodes[type][LABEL]}</span>
					</Fragment>
				))}
				{onRemove && (
					<input
						className="float"
						value="Remove"
						type="button"
						onClick={onRemove}
					/>
				)}
				<hr />
				<Select
					hash=""
					parentProperty={SUBPROPERTY}
					parentDescription="Subproperty"
					childDescription="Children"
					placeholder="Search for a property to enter values"
					catalog={catalog}
					inheritance={propertyInheritance}
					onSubmit={property => {
						const [type] = flattenValues(nodes[property][RANGE])
						const formValue = FormView.defaultFormValue(type, graph)
						if (form.has(property)) {
							const path = [property, form.get(property).size]
							const focus = path.join("/")
							this.setState({ focus })
							onChange(form.setIn(path, formValue))
						} else {
							const focus = [property, 0].join("/")
							this.setState({ focus })
							onChange(form.set(property, List([formValue])))
						}
					}}
				/>
				<div className="table-scroller">
					<table>
						<tbody>{form.entrySeq().map(this.renderProperty)}</tbody>
					</table>
				</div>
			</div>
		)
	}
	private renderProperty(
		[property, values]: [string, List<FormValue>],
		key: number
	) {
		const label = nodes[property]["rdfs:label"]
		return values.map((formValue, index) => (
			<tr key={`${key}/${index}`}>
				{index === 0 && (
					<td className="mono" rowSpan={values.size}>
						{label}
					</td>
				)}
				<td className="type">{this.renderType(property, index, formValue)}</td>
				<td className="value">
					{this.renderValue(property, index, formValue)}
				</td>
				<td>
					<input
						type="button"
						value="Remove"
						onClick={() => this.removeProperty(property, index)}
					/>
				</td>
			</tr>
		))
	}
	private renderType(property: string, index: number, formValue: FormValue) {
		const range = flattenValues(nodes[property][RANGE])
		return (
			<select
				value={formValue.type}
				disabled={range.length === 1}
				onChange={event => {
					const type = event.target.value
					if (type !== formValue.type) {
						const path = [property, index]
						const formValue = FormView.defaultFormValue(type, this.props.graph)
						const form = this.props.form.setIn(path, formValue)
						this.props.onChange(form)
					}
				}}
			>
				{range.map((type, key) => (
					<option key={key} value={type}>
						{nodes[type][LABEL]}
					</option>
				))}
			</select>
		)
	}
	private renderValue(property: string, index: number, formValue: FormValue) {
		const { createNode, graph, id } = this.props
		const label = nodes[property][LABEL]
		const path = id.split("/").concat([label, index.toString()])
		return (
			<PropertyView
				path={path}
				graph={graph}
				formValue={formValue}
				createNode={createNode}
				onChange={(value, newId, newForm) => {
					const path = [property, index]
					const form = this.props.form.setIn(path, value)
					this.props.onChange(form, newId, newForm)
				}}
			/>
		)
	}
	private removeProperty(property: string, index: number) {
		const { form } = this.props
		if (form.get(property).size > 1) {
			const path = [property, index]
			this.props.onChange(form.deleteIn(path))
		} else {
			this.props.onChange(form.delete(property))
		}
	}
	private static defaultFormValue(type: string, nodes: Map<string, string[]>) {
		const props: Partial<FormValue> = { type }
		if (constants.hasOwnProperty(type)) {
			props.value = Constant
			props.constant = FormView.defaultValues.hasOwnProperty(type)
				? FormView.defaultValues[type]
				: FormView.defaultValue
		} else {
			const id = nodes.findKey(types =>
				types.some(t => searchAncestry(t, type, SUBCLASS))
			)
			if (id !== undefined) {
				props.value = Reference
				props.reference = id
			} else {
				props.value = Inline
				props.inline = Map({})
			}
		}
		return new FormValue(props)
	}
}
