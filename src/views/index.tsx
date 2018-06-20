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
} from "../schema"
import { Map } from "immutable"
import GeoCoordinates from "./types/geo-coordinates"
import MediaObject from "./types/media-object"

const renderers: { [type: string]: (props: ViewProps) => JSX.Element } = {
	["http://schema.org/Person"](props: ViewProps) {
		return null
	},
	["http://schema.org/Place"](props: ViewProps) {
		const geo = props.props["http://schema.org/geo"]
		if (geo !== undefined) {
			const values = Array.isArray(geo) ? geo : [geo]
			return (
				<Fragment>
					{values.map((value, key) => (
						<GeoCoordinates key={key} value={value} graph={props.graph} />
					))}
				</Fragment>
			)
		}
	},
	["http://schema.org/CreativeWork"](props: ViewProps) {
		const media = props.props["http://schema.org/associatedMedia"]
		if (media !== undefined) {
			const values = Array.isArray(media) ? media : [media]
			return (
				<Fragment>
					{values.map((value, key) => (
						<MediaObject key={key} value={value} graph={props.graph} />
					))}
				</Fragment>
			)
		}
	},
}

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
	console.log("getting node values", values, graph)
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

const ThingProps = {
	name(value: SourcedValues) {
		const name = getConstant(value) as string
		if (name) {
			return <h1>{name}</h1>
		}
	},
	url(value: SourcedValues) {
		const url = getConstant(value) as string
		if (url) {
			return <a href={url}>{url}</a>
		}
	},
	descrition(value: SourcedValues) {
		const text = getConstant(value) as string
		if (text) {
			return <p>{text}</p>
		}
	},
}

function Thing(props: ViewProps) {
	return (
		<div>
			{ThingProps.name(props.props["http://schema.org/name"])}
			{ThingProps.url(props.props["http://schema.org/url"])}
			{ThingProps.descrition(props.props["http://schema.org/description"])}
			{props.children}
		</div>
	)
}

export interface ViewProps {
	children?: any
	graph: Map<string, SourcedNode>
	type: string
	props: { [prop: string]: SourcedValues }
}

export interface ValueProps {
	graph: Map<string, SourcedNode>
	value: SourcedConstant | SourcedReference | SourcedInline
}

export default function View(props: ViewProps) {
	const ancestors = Array.from(ancestry[props.type])
	const type = ancestors.find(type => renderers.hasOwnProperty(type))
	return <Thing {...props}>{type ? renderers[type](props) : null}</Thing>
}
