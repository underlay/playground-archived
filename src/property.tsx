import React, { Fragment } from "react"
import { List, Map } from "immutable"
import {
	things,
	nodes,
	enumerations,
	searchAncestry,
	classInheritance,
} from "./schema"
import { LABEL, SUBCLASS } from "./schema/constants"
import Form, {
	FormValue,
	Constant,
	Reference,
	Inline,
	FormValueType,
	FormValues,
	FormProps,
} from "./form"
import { constants } from "./constants"
import Select from "./select"

interface PropertyViewProps {
	path: string[]
	formValue: FormValue
	children: any
	graph: Map<string, string[]>
	createNode: (types: string[]) => string
	onChange: (value: FormValue, newId?: string, newForm?: FormValues) => void
}

function renderInline(props: PropertyViewProps, onClick: () => void) {
	const { createNode, formValue } = props
	const id = props.path.join("/")
	const graph = props.graph.set(id, [formValue.type])
	const onChange = (inline, newId, newForm) => {
		// the newId and newForm here are passed up in case a *nested* form
		// way down the line tries to split into a new object
		props.onChange(formValue.with({ inline }), newId, newForm)
	}
	const form = formValue.inline
	const formProps: FormProps = {
		createNode,
		graph,
		id,
		onChange,
		form,
		label: "Split into new object",
		onClick,
	}
	return <Form {...formProps} />
}

export default function PropertyView(props: PropertyViewProps) {
	const { formValue, createNode, onChange } = props
	const { value, type } = formValue
	if (constants.hasOwnProperty(type) && value === Constant) {
		const { props, getValue, setValue } = constants[type]
		return (
			<input
				{...props.merge(setValue(formValue.constant)).toJS()}
				onChange={event =>
					onChange(formValue.with({ constant: getValue(event) }))
				}
				onKeyDown={event => event.keyCode === 13 && event.preventDefault()}
			/>
		)
	} else if (things.has(type)) {
		const objects: List<[string, string[]]> = List(
			props.graph
				.entrySeq()
				.filter(([_, types]: [string, string[]]) =>
					types.some(t => searchAncestry(t, type, SUBCLASS))
				)
		)
		const hasObjects = objects.size > 0
		const hasEnumerations = enumerations.hasOwnProperty(type)
		const disabled = !hasObjects && !hasEnumerations
		const label = nodes[type][LABEL]
		const defaultValue = hasObjects
			? objects.get(0)[0]
			: hasEnumerations
				? Array.from(enumerations[type])[0]
				: ""
		const name = props.path.join("/")
		const radio = (valueType: FormValueType) => ({
			type: "radio",
			name,
			value: valueType.toString(),
			checked: value === valueType,
			onChange({ target: { value } }) {
				const newValue = formValue.with({ value })
				if (value === Inline && newValue.inline === null) {
					onChange(newValue.with({ inline: Map({}) }))
				} else {
					onChange(newValue)
				}
			},
		})
		return (
			<Fragment>
				<label className="reference">
					<input {...radio(Reference)} disabled={disabled} />
					<select
						disabled={disabled || value !== Reference}
						value={formValue.reference || defaultValue}
						onChange={event => {
							event.preventDefault()
							const reference = event.target.value
							const props = { value: Reference, reference, inline: null }
							onChange(formValue.with(props))
						}}
					>
						{disabled && <option value="">No {label} objects found.</option>}
						{Array.from(enumerations[type] || []).map((id, key) => (
							<option key={-(key + 1)} value={id}>
								{nodes[id][LABEL]}
							</option>
						))}
						{objects.map(([id], key) => (
							<option key={key} value={id}>
								{id}
							</option>
						))}
					</select>
					{props.children}
				</label>
				<label className="inline">
					<input {...radio(Inline)} />
					<span>Create object inline</span>
				</label>
				{value === Inline &&
					renderInline(props, () => {
						const reference = createNode([type])
						const inline: FormValues = Map({})
						const values = { value: Reference, reference, inline }
						onChange(formValue.with(values), reference, props.formValue.inline)
					})}
			</Fragment>
		)
	} else {
		return <span>"Cannot enter this kind of value yet"</span>
	}
}
