import {
	ID,
	TYPE,
	GRAPH,
	LABEL,
	COMMENT,
	CONTEXT,
	SOURCE,
	TIME,
} from "./constants"

type Context = string | { [key: string]: string }
export type PropertyValue = string | Node<any>
export type PropertyValues = PropertyValue | PropertyValue[]

export interface Value {
	[TYPE]: string
}

export interface SourcedValue extends Value {
	[SOURCE]: string
}

interface Constant extends Value {
	"@value": string | number | boolean
}
interface Reference extends Value {
	"@id": string
}

interface Inline extends Value {
	[prop: string]: string | Array<Constant | Reference | Inline>
}

export interface SourcedConstant extends Constant, SourcedValue {}
export interface SourcedReference extends Reference, SourcedValue {}
export interface SourcedInline extends Inline, SourcedValue {}

export type Values = Array<Constant | Reference | Inline>
export type SourcedValues = Array<
	SourcedConstant | SourcedReference | SourcedInline
>

interface Node<P> {
	[ID]: string
	[TYPE]: string | string[]
	[property: string]: P | string | string[]
}

export interface SchemaNode extends Node<PropertyValues> {
	[LABEL]: string
	[COMMENT]: string
}

export type AssertionNode = Node<Values>
export type SourcedNode = Node<
	SourcedValues | SourcedConstant | SourcedReference | SourcedInline
>

export interface Graph<T extends Node<any>> {
	[ID]?: string
	[CONTEXT]: Context
	[GRAPH]: T[]
}

export type AssertionGraph = Graph<AssertionNode>
// export interface Assertion extends Graph<AssertionNode> {
// 	[SOURCE]: string
// 	[TIME]: string
// }

export interface SchemaGraph extends Graph<SchemaNode> {
	[ID]: string
}
