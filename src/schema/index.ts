export const ID = "@id"
export const TYPE = "@type"
export const DATA = "@data"
export const VALUE = "@value"
export const CONTEXT = "@context"
export const GRAPH = "@graph"
export const SOURCE = "http://underlay.mit.edu/source"
export const TIME = "http://underlay.mit.edu/time"
export const LABEL = "rdfs:label"
export const COMMENT = "rdfs:comment"
export const DOMAIN = "http://schema.org/domainIncludes"
export const RANGE = "http://schema.org/rangeIncludes"
export const SUBPROPERTY = "rdfs:subPropertyOf"
export const SUBCLASS = "rdfs:subClassOf"
export const enumeration = "http://schema.org/Enumeration"

function flattenValue(propertyValue: PropertyValue): string {
	if (typeof propertyValue === "object") {
		return propertyValue["@id"]
	} else if (typeof propertyValue === "string") {
		return propertyValue
	}
}

export function flattenValues(propertyValues: PropertyValues): string[] {
	if (propertyValues === null || propertyValues === undefined) {
		return []
	} else if (Array.isArray(propertyValues)) {
		return propertyValues.map(flattenValue)
	} else {
		return [flattenValue(propertyValues)]
	}
}

type Context = string | { [key: string]: string }
type PropertyValue = string | Node<any>
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

interface SchemaNode extends Node<PropertyValues> {
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

export interface Assertion extends Graph<AssertionNode> {
	[SOURCE]: string
	[TIME]: string
}

interface SchemaGraph extends Graph<SchemaNode> {
	[ID]: string
}

export const schema: SchemaGraph = require("./schema.json")
;(window as any).schema = schema

export const nodes: { [id: string]: SchemaNode } = {}
schema[GRAPH].forEach(node => (nodes[node[ID]] = node))
;(window as any).nodes = nodes

export const thing = "http://schema.org/Thing"
export const things: Set<string> = new Set([thing])
function traverseThings(node: SchemaNode): boolean {
	let isThing = false
	if (!things.has(node[ID])) {
		flattenValues(node[SUBCLASS]).forEach(subclass => {
			if (things.has(subclass)) {
				things.add(node[ID])
				isThing = true
			} else if (nodes.hasOwnProperty(subclass)) {
				if (traverseThings(nodes[subclass])) {
					things.add(node[ID])
					isThing = true
				}
			}
		})
	}
	return isThing
}

schema[GRAPH].forEach(traverseThings)
;(window as any).things = things

export const ancestry: { [type: string]: Set<string> } = {}
function traverseAncestry(type: string, history: Set<string>) {
	history.add(type)
	if (nodes.hasOwnProperty(type) && nodes[type].hasOwnProperty(SUBCLASS)) {
		flattenValues(nodes[type][SUBCLASS]).forEach(value =>
			traverseAncestry(value, history)
		)
	}
}

function enumerateAncestry(type: string) {
	const history = new Set()
	traverseAncestry(type, history)
	return history
}
things.forEach(type => {
	ancestry[type] = enumerateAncestry(type)
})

export const inheritance: { [type: string]: Set<string> } = {}
const keys = Object.keys(ancestry)
things.forEach(type => {
	const types = keys.filter(key => ancestry[key].has(type))
	const set = new Set()
	things.forEach(epyt => ancestry[epyt].has(type) && set.add(epyt))
	inheritance[type] = set
})

export function enumerateProperties(type: string): string[] {
	return schema[GRAPH].filter(
		node =>
			node.hasOwnProperty(DOMAIN) && flattenValues(node[DOMAIN]).includes(type)
	).map(node => node["@id"])
}

export const enumerations: { [type: string]: Set<string> } = {}

schema[GRAPH].forEach(node => {
	const id = node[ID]
	if (id !== enumeration && enumerateAncestry(id).has(enumeration)) {
		enumerations[id] = new Set([])
	}
})

schema[GRAPH].forEach(node => {
	flattenValues(node[TYPE]).forEach(type => {
		if (enumerations.hasOwnProperty(type)) {
			enumerations[type].add(node[ID])
		}
	})
})
;(window as any).enumerations = enumerations
