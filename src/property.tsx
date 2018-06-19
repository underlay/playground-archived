import React, { Fragment } from "react"
import { List, Map } from "immutable"
import {
	things,
	nodes,
	enumerations,
	LABEL,
	TYPE,
	inheritance,
	flattenValues,
	SourcedNode,
} from "./schema"

import Form, {
	FormValue,
	Constant,
	Reference,
	Inline,
	FormValueType,
	FormValues,
} from "./form"
import { constants } from "./constants"

interface PropertyViewProps {
	path: string[]
	focus: string
	graph: Map<string, SourcedNode>
	createNode: (type: string) => string
	onChange: (value: FormValue, id?: string, formValues?: FormValues) => void
	formValue: FormValue
}

export default function PropertyView(props: PropertyViewProps) {
	const { graph, createNode, formValue, focus, path, onChange } = props
	const { value, type } = formValue
	const autoFocus = focus === path.join("/")
	if (constants.hasOwnProperty(type) && value === Constant) {
		const { props, getValue, setValue } = constants[type]
		return (
			<input
				{...props.merge(setValue(formValue.constant)).toJS()}
				onChange={event =>
					onChange(formValue.with({ constant: getValue(event) }))
				}
				onKeyDown={event => event.keyCode === 13 && event.preventDefault()}
				autoFocus={autoFocus}
			/>
		)
	} else if (things.has(type)) {
		const inherited = inheritance[type]
		const objects: List<[string, string[]]> = List(
			props.graph
				.entrySeq()
				.map(([id, node]) => [id, flattenValues(node[TYPE])])
				.filter(([id, types]: [string, string[]]) =>
					types.some(t => inherited.has(t))
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
		const radio = (valueType: FormValueType) => ({
			type: "radio",
			name: "value",
			value: valueType.toString(),
			checked: value === valueType,
			onChange: ({ target: { value } }) => onChange(formValue.with({ value })),
		})
		return (
			<Fragment>
				<input {...radio(Reference)} disabled={disabled} />
				<select
					disabled={disabled}
					autoFocus={autoFocus}
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

				<br />
				<input {...radio(Inline)} />
				<select disabled={inherited.size === 1}>
					{Array.from(inherited).map((subtype, key) => (
						<option key={key}>{nodes[subtype][LABEL]}</option>
					))}
				</select>
				<input
					type="button"
					value={`Split into new object`}
					autoFocus={autoFocus && objects.size === 0}
					onClick={event => {
						event.preventDefault()
						const reference = createNode(type)
						const inline: FormValues = Map({})
						const props = { value: Reference, reference, inline }
						onChange(formValue.with(props), reference, formValue.inline)
					}}
				/>
				{value === Inline && (
					<Fragment>
						<br />
						<Form
							createNode={createNode}
							graph={graph}
							form={formValue.inline}
							id={null}
							focus={props.focus}
							path={props.path}
							types={[formValue.type]}
							onChange={inline => onChange(formValue.with({ inline }))}
						/>
					</Fragment>
				)}
			</Fragment>
		)
	} else {
		return <span>"Cannot enter this kind of value yet"</span>
	}
}
