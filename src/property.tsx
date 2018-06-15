import React, { ChangeEvent } from "react"
import { List, Map, Record } from "immutable"
import { things, nodes, enumerateAncestry, enumerations, LABEL } from "./schema"

interface PropertyViewProps {
	autoFocus: boolean
	objects: Map<string, List<string>>
	createObject: (type: string) => string
	onChange: (entry: List<string>) => void
	// Only two elements: [type, value]. Immutable.js doesn't have tuples.
	entry: List<string>
}

interface TypeParams {
	getValue: (event: ChangeEvent<HTMLInputElement>) => string
	setValue: (value: string) => Map<string, string>
	props: Map<string, string>
}

const defaultGetValue = event => JSON.stringify(event.target.value)
const defaultSetValue = value => Map({ value: value ? JSON.parse(value) : "" })
const defaultProps = Map({ type: "text" })

export class Type extends Record({
	getValue: defaultGetValue,
	setValue: defaultSetValue,
	props: defaultProps,
}) {
	getValue: (event: ChangeEvent<HTMLInputElement>) => string
	setValue: (value: string) => Map<string, string>
	props: Map<string, string>

	constructor(params?: Partial<TypeParams>) {
		if (params) super(params)
		else super()
	}

	with(values: Partial<TypeParams>) {
		return this.merge(values) as this
	}
}

const defaultType = new Type()
const nameType: ((type: string) => Type) = (type: string) =>
	defaultType.with({ props: Map({ type }) })
const numberType = nameType("number")
const floatType = numberType.with({
	getValue: event => parseFloat(event.target.value).toString(),
})
const integerType = numberType.with({
	getValue: event => parseInt(event.target.value).toString(),
})
const booleanType = nameType("checkbox").with({
	getValue: event => JSON.stringify(event.target.checked),
	setValue: value => Map({ checked: value ? JSON.parse(value) : false }),
})

export const types: { [type: string]: Type } = {
	"http://schema.org/Text": defaultType,
	"http://schema.org/URL": nameType("url"),
	"http://schema.org/Number": floatType,
	"http://schema.org/Float": floatType,
	"http://schema.org/Integer": integerType,
	"http://schema.org/Boolean": booleanType,
	"http://schema.org/Date": nameType("date"),
	"http://schema.org/Time": nameType("time"),
	"http://schema.org/DateTime": nameType("datetime-local"),
}

export default function PropertyView(props: PropertyViewProps) {
	const { createObject, entry, autoFocus, onChange } = props
	const entryType = entry.get(0)
	const entryValue = entry.get(1)

	if (types.hasOwnProperty(entryType)) {
		const { props, getValue, setValue } = types[entryType]
		return (
			<input
				{...props.merge(setValue(entryValue)).toJS()}
				onChange={event => onChange(entry.set(1, getValue(event)))}
				autoFocus={autoFocus}
			/>
		)
	} else if (things.has(entryType)) {
		const objects: List<[string, string]> = List(
			props.objects
				.entrySeq()
				.filter(([id, types]) =>
					types
						.reduce((types, type) => types.concat(enumerateAncestry(type)), [])
						.includes(entryType)
				)
		)
		const hasObjects = objects.size > 0,
			hasEnumerations = enumerations.hasOwnProperty(entryType)
		const disabled = !hasObjects && !hasEnumerations
		const label = nodes[entryType][LABEL]
		const defaultValue = hasObjects
			? objects.get(0)[0]
			: hasEnumerations
				? Array.from(enumerations[entryType])[0]
				: ""
		return (
			<React.Fragment>
				<select
					disabled={disabled}
					autoFocus={autoFocus}
					value={entryValue || defaultValue}
					onChange={event => {
						event.preventDefault()
						onChange(entry.set(1, event.target.value))
					}}
				>
					{disabled && <option value="">No {label} objects found.</option>}
					{Array.from(enumerations[entryType] || []).map((id, key) => (
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
				<input
					type="button"
					value={`Create new ${label}`}
					autoFocus={autoFocus && objects.size === 0}
					onClick={event => {
						event.preventDefault()
						onChange(entry.set(1, createObject(entryType)))
					}}
				/>
			</React.Fragment>
		)
	} else {
		return <span>"Cannot enter this kind of value yet"</span>
	}
}
