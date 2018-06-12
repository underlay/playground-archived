export const ID = "@id"
export const TYPE = "@type"
export const VALUE = "@value"
export const CONTEXT = "@context"
export const GRAPH = "@graph"
export const LABEL = "rdfs:label"
export const COMMENT = "rdfs:comment"
export const DOMAIN = "http://schema.org/domainIncludes"
export const RANGE = "http://schema.org/rangeIncludes"
export const SUBPROPERTY = "rdfs:subPropertyOf"
export const SUBCLASS = "rdfs:subClassOf"
export const enumeration = "http://schema.org/Enumeration"

type PropertyValue = string | Node
type PropertyValues = PropertyValue | PropertyValue[]

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

export interface Node {
	[ID]: string
	[TYPE]: string | string[]
	[property: string]: PropertyValues
}

export interface SchemaNode extends Node {
	[LABEL]: string
	[COMMENT]: string
}

interface Schema {
	[ID]: string
	[CONTEXT]: { [key: string]: string }
	[GRAPH]: SchemaNode[]
}

export const schema: Schema = require("./schema.json")
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

function traverseAncestry(type: string, history: string[]) {
	history.push(type)
	if (nodes.hasOwnProperty(type) && nodes[type].hasOwnProperty(SUBCLASS)) {
		flattenValues(nodes[type][SUBCLASS]).forEach(value =>
			traverseAncestry(value, history)
		)
	}
}

export function enumerateAncestry(type: string): string[] {
	const history = []
	traverseAncestry(type, history)
	return history
}

export function enumerateProperties(type: string): string[] {
	return schema[GRAPH].filter(
		node =>
			node.hasOwnProperty(DOMAIN) && flattenValues(node[DOMAIN]).includes(type)
	).map(node => node["@id"])
}

export const enumerations: { [type: string]: Set<string> } = {}

schema[GRAPH].forEach(node => {
	const id = node[ID]
	if (id !== enumeration && enumerateAncestry(id).includes(enumeration)) {
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
