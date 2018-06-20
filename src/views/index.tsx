import React, { Fragment } from "react"
import {
	SourcedNode,
	VALUE,
	SourcedValues,
	ancestry,
	SourcedConstant,
	ID,
	TYPE,
	SOURCE,
	SourcedReference,
	SourcedInline,
	Values,
} from "../schema"
import { Map } from "immutable"
import GeoCoordinates from "./types/geo-coordinates"

export function getConstant(value: SourcedValues) {
	if (value && value.length > 0 && value[0].hasOwnProperty(VALUE)) {
		const first = value[0] as SourcedConstant
		return first[VALUE]
	} else {
		return null
	}
}

export function getNodeValues(
	values: SourcedValues,
	graph: Map<string, SourcedNode>
): { [prop: string]: SourcedValues } {
	if (values) {
		const value = Array.isArray(values) ? values[0] : values
		if (value.hasOwnProperty(ID)) {
			const id = value[ID]
			if (graph.has(id)) {
				const {
					[ID]: _id,
					[TYPE]: _type,
					[SOURCE]: _source,
					...rest
				} = graph.get(id)
				return rest as { [prop: string]: SourcedValues }
			}
		} else {
			const { [TYPE]: _type, [SOURCE]: source, ...rest } = value
			const sourced: { [prop: string]: SourcedValues } = {}
			Object.keys(rest).forEach(key => {
				const vals = Array.isArray(rest[key]) ? rest[key] : [rest[key]]
				sourced[key] = vals.map(value => ({ [SOURCE]: source, ...value }))
			})
			return sourced
		}
	}
	return null
}

export interface ViewProps {
	children?: any
	key?: number
	depth: number
	graph: Map<string, SourcedNode>
	type: string
	props: { [prop: string]: SourcedValues }
}

export interface ValueProps {
	graph: Map<string, SourcedNode>
	depth: number
	value: SourcedConstant | SourcedReference | SourcedInline
}

type ResolvedValue = [{ [prop: string]: SourcedValues }, SourcedInline]

function resolve(
	value: SourcedReference | SourcedInline,
	graph: Map<string, SourcedNode>
): { [prop: string]: SourcedValues } {
	const { [TYPE]: type, [SOURCE]: source, ...rest } = value
	if (rest.hasOwnProperty(ID)) {
		// reference
		if (graph.has(rest[ID])) {
			const { [ID]: id, [TYPE]: type, ...props } = graph.get(rest[ID])
			return props as { [prop: string]: SourcedValues }
		}
	} else {
		// inline
		const props: { [prop: string]: SourcedValues } = {}
		Object.keys(rest).forEach(key => {
			const value: Values = rest[key]
			const values: Values = Array.isArray(value) ? value : [value]
			const sourcedValues: SourcedValues = values.map(value => ({
				[SOURCE]: source,
				...value,
			}))
			props[key] = sourcedValues
		})
		return props
	}
	return null
}

const renderers = {
	"http://schema.org/Thing"({ depth, props, children }: ViewProps) {
		const name = getConstant(props["http://schema.org/name"])
		const alternateName = getConstant(props["http://schema.org/alternateName"])
		const url = getConstant(props["http://schema.org/url"]) as string
		const description = getConstant(props["http://schema.org/description"])
		const header = `h${Math.min(6, depth)}`
		const properties = depth > 1 ? { className: "max-width" } : {}
		return (
			<Fragment>
				{name && React.createElement(header, properties, [name])}
				{alternateName && depth < 2 && <h3>{alternateName}</h3>}
				{url && depth < 2 && <a href={url}>{url}</a>}
				{description && depth < 2 && <p>{description}</p>}
				{children}
			</Fragment>
		)
	},
	"http://schema.org/CreativeWork"({
		graph,
		depth,
		props,
		children,
	}: ViewProps) {
		// media
		let associatedMedia = null
		const value = props["http://schema.org/associatedMedia"]
		const position = "http://schema.org/position"
		if (value) {
			const values = Array.isArray(value) ? value : [value]
			let resolvedValues: ResolvedValue[] = values.map(
				(value: SourcedInline) => {
					const props = resolve(value, graph)
					return [props, value] as ResolvedValue
				}
			)
			if (resolvedValues.every(([props]) => props.hasOwnProperty(position))) {
				resolvedValues = resolvedValues.sort(
					(a: ResolvedValue, b: ResolvedValue) =>
						(getConstant(a[1][position] as SourcedValues) as number) -
						(getConstant(b[1][position] as SourcedValues) as number)
				)
			}
			associatedMedia = resolvedValues.map(
				([props, value]: ResolvedValue, key) => {
					const type = value[TYPE]
					const properties = { key, type, graph, props, depth: depth + 1 }
					return <RealView {...properties} />
				}
			)
		}
		const header = `h${Math.min(6, depth + 1)}`
		return (
			<Fragment>
				{associatedMedia && (
					<Fragment>
						{React.createElement(header, {}, ["Associated media"])}
						<div className="carousel">{associatedMedia}</div>
					</Fragment>
				)}
				{children}
			</Fragment>
		)
	},
	"http://schema.org/MediaObject"({ props, children }: ViewProps) {
		const content = "http://schema.org/contentUrl"
		const format = "http://schema.org/encodingFormat"
		const mime = getConstant(props[format]) as string
		const src = getConstant(props[content]) as string
		const display = mime && src
		return (
			<Fragment>
				{display &&
					(mediaRenderers.hasOwnProperty(mime) &&
						mediaRenderers[mime](mime, src))}
				{children}
			</Fragment>
		)
	},
	"http://schema.org/Place"({ children }: ViewProps) {
		return (
			<Fragment>
				<p>And i'm a place</p>
				{children}
			</Fragment>
		)
	},
}

export function RealView({ depth, graph, type, props }: ViewProps) {
	const ancestors = Array.from(ancestry[type])
	const children = ancestors.reduce((child, type, key) => {
		if (renderers.hasOwnProperty(type)) {
			const properties = { key, graph, props, type, depth: depth + 1 }
			return React.createElement(renderers[type], properties, [child])
		} else {
			return child
		}
	}, null)
	return <div>{children}</div>
}

const mediaRenderers = {
	"text/csv"(encodingFormat: string, contentUrl: string) {},
	"application/pdf"(encodingFormat: string, contentUrl: string) {
		return <object data={contentUrl} type={encodingFormat} />
	},
	"image/jpeg"(encodingFormat: string, contentUrl: string) {
		return <img className="image" src={contentUrl} />
	},
}
