import React, { Fragment } from "react"
import { Map, List, Record } from "immutable"
import {
	SourcedNode,
	flattenValues,
	nodes,
	LABEL,
	RANGE,
	ancestry,
	enumerateProperties,
	TYPE,
	inheritance,
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
	inline: Map({}),
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

interface FormProps {
	createNode: (type: string) => string
	graph: Map<string, SourcedNode>
	form: FormValues
	id: string
	types: string[]
	focus: string
	path: string[]
	onRemove?: () => void
	onChange: (form: FormValues, id?: string, formValues?: FormValues) => void
}

interface FormState {
	focus: string
}

export default class FormView extends React.Component<FormProps, FormState> {
	private static defaultValues = { "http://schema.org/Boolean": false }
	private static defaultValue = ""
	private static generateProperties(types: string[]): List<List<string>> {
		const set: Set<string> = new Set()
		const props = types.reduce((props: List<List<string>>, type) => {
			return props.concat(
				Array.from(ancestry[type]).reduce((props: List<List<string>>, type) => {
					const filter = (prop: string) => !set.has(prop) && !!set.add(prop)
					const properties = enumerateProperties(type).filter(filter)
					return props.concat(properties.map(prop => List([prop, type])))
				}, List([]))
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
		const { id, types, onRemove, form } = this.props
		const catalog = FormView.generateProperties(types)
		return (
			<div className="form">
				{id && (
					<Fragment>
						<h3>{id}</h3>
						{types.map(type => nodes[type][LABEL]).join(", ")}
						<input value="Remove" type="button" onClick={onRemove} />
						<hr />
					</Fragment>
				)}
				<Select
					placeholder="Search for a property"
					catalog={catalog}
					onSubmit={property => {
						const [type] = flattenValues(nodes[property][RANGE])
						const formValue = FormView.defaultFormValue(type, this.props.graph)
						if (this.props.form.has(property)) {
							const path = [property, form.get(property).size]
							const focus = path.join("/")
							this.setState({ focus })
							this.props.onChange(form.setIn(path, formValue))
						} else {
							const focus = [property, 0].join("/")
							this.setState({ focus })
							this.props.onChange(form.set(property, List([formValue])))
						}
					}}
				/>
				<hr />
				<table>
					<tbody>
						{form.size > 0 ? (
							form.entrySeq().map(this.renderProperty)
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
		[property, values]: [string, List<FormValue>],
		key: number
	) {
		const label = nodes[property]["rdfs:label"]
		return values.map((formValue, index) => (
			<tr key={`${key}/${index}`}>
				{index === 0 && <td rowSpan={values.size}>{label}</td>}
				<td>{this.renderType(property, index, formValue)}</td>
				<td>{this.renderValue(property, index, formValue)}</td>
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
						{nodes[type]["rdfs:label"]}
					</option>
				))}
			</select>
		)
	}
	private renderValue(property: string, index: number, formValue: FormValue) {
		const { createNode, graph, path, focus } = this.props
		// const autoFocus = this.state.focus === [property, index].join("/")
		return (
			<PropertyView
				{...{ focus, path, formValue, graph, createNode }}
				onChange={(value, id, formValues) => {
					const form = this.props.form.setIn([property, index], value)
					this.props.onChange(form, id, formValues)
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
	private static defaultFormValue(
		type: string,
		graph: Map<string, SourcedNode>
	) {
		const props: Partial<FormValue> = { type }
		if (constants.hasOwnProperty(type)) {
			props.value = Constant
			props.constant = FormView.defaultValues.hasOwnProperty(type)
				? FormView.defaultValues[type]
				: FormView.defaultValue
		} else {
			const predicate = (node: SourcedNode) =>
				flattenValues(node[TYPE]).some(t => inheritance[type].has(t))
			const ref = graph.findKey(node => predicate(node))
			if (ref !== undefined) {
				props.value = Reference
				props.reference = ref
			} else {
				props.value = Inline
				props.inline = Map({})
			}
		}
		return new FormValue(props)
	}
}
