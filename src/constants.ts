import { ChangeEvent } from "react"
import { Map, Record } from "immutable"

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

export const constants: { [type: string]: Type } = {
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
