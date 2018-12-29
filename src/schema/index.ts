import {
	TYPE,
	ID,
	GRAPH,
	SUBCLASS,
	DOMAIN,
	enumeration,
	thing,
	property,
	SUBPROPERTY,
} from "../utils/constants"

import { PropertyValue, PropertyValues, SchemaGraph, SchemaNode } from "./types"
import schemaJSON from "./schema.json"

const schema = schemaJSON as SchemaGraph

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

;(window as any).schema = schema

export const nodes: { [id: string]: SchemaNode } = {}
schema[GRAPH].forEach(node => (nodes[node[ID]] = node))
;(window as any).nodes = nodes

export const properties: Set<string> = new Set([])
function traverseProperties(node: SchemaNode) {
	if (node[TYPE] === property) {
		properties.add(node[ID])
	}
}

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

schema[GRAPH].forEach(node => {
	traverseProperties(node)
	traverseThings(node)
})
;(window as any).things = things
;(window as any).properties = properties

export function searchAncestry(
	type: string,
	target: string,
	parent: string
): boolean {
	if (type === target) return true
	else if (nodes[type] && nodes[type][parent]) {
		return flattenValues(nodes[type][parent]).some(t =>
			searchAncestry(t, target, parent)
		)
	} else return false
}

function traverseAncestry(type: string, parent: string, ancestry: string[]) {
	ancestry.push(type)
	if (nodes[type] && nodes[type][parent]) {
		flattenValues(nodes[type][parent]).forEach(value =>
			traverseAncestry(value, parent, ancestry)
		)
	}
}

export function enumerateAncestry(type: string, parent: string): string[] {
	const ancestry = []
	traverseAncestry(type, parent, ancestry)
	return ancestry
}

export function enumerateProperties(type: string): string[] {
	return schema[GRAPH].filter(
		node => node[DOMAIN] && flattenValues(node[DOMAIN]).includes(type)
	).map(node => node[ID])
}

type Inheritance = { [id: string]: Set<string> }

function traverseInheritance(
	inheritance: Inheritance,
	pool: Set<string>,
	parent: string
) {
	pool.forEach(id => {
		if (!inheritance[id]) inheritance[id] = new Set([])
		flattenValues(nodes[id][parent]).forEach(ancestor => {
			if (!inheritance[ancestor]) inheritance[ancestor] = new Set([])
			inheritance[ancestor].add(id)
		})
	})
}

export const classInheritance: Inheritance = {}
export const propertyInheritance: Inheritance = {}
traverseInheritance(classInheritance, things, SUBCLASS)
traverseInheritance(propertyInheritance, properties, SUBPROPERTY)
;(window as any).classInheritance = classInheritance
;(window as any).propertyInheritance = propertyInheritance

export const enumerations: { [type: string]: Set<string> } = {}

schema[GRAPH].forEach(({ [ID]: id }) => {
	if (id !== enumeration && searchAncestry(id, enumeration, SUBCLASS)) {
		enumerations[id] = new Set([])
	}
})

schema[GRAPH].forEach(({ [ID]: id, [TYPE]: type }) => {
	flattenValues(type).forEach(type => {
		if (enumerations.hasOwnProperty(type)) {
			enumerations[type].add(id)
		}
	})
})
;(window as any).enumerations = enumerations
