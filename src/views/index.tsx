import React, { Fragment } from "react"
import { ID, TYPE, SOURCE, VALUE, LABEL, SUBCLASS } from "../schema/constants"
import {
	SourcedNode,
	SourcedValues,
	SourcedConstant,
	SourcedReference,
	SourcedInline,
	Values,
} from "../schema/types"
import { nodes, enumerateAncestry } from "../schema"
import { Map, List, Set } from "immutable"
// import MapView from "./types/map"
import TableView from "./types/table"

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
	root: boolean
	path: string[]
	key?: number
	depth: number
	graph: Map<string, SourcedNode>
	explorer: Set<List<string>>
	onExplore: (path: string[]) => void
	type: string
	props: { [prop: string]: SourcedValues }
	focused: string
	onFocus: (focus: string) => void
}

export interface ValueProps {
	graph: Map<string, SourcedNode>
	depth: number
	value: SourcedConstant | SourcedReference | SourcedInline
}

type ResolvedValue = [
	{ [prop: string]: SourcedValues },
	SourcedInline | SourcedReference
]

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

function renderHeader(
	name: string,
	depth: number,
	onClick: () => void,
	open: boolean,
	opened: boolean
) {
	const className = open ? "header max-width" : "header"
	const tag = `h${Math.min(6, depth)}`
	const element = name && React.createElement(tag, { className }, [name])
	if (open) {
		return (
			<header className={opened ? "opened" : null}>
				{element}
				<button className="float" onClick={onClick} disabled={opened}>
					Open
				</button>
			</header>
		)
	} else {
		return element
	}
}

function renderSource(source: string) {
	return <div className="source">{source}</div>
}

const makeId = path =>
	path.map(v => (nodes.hasOwnProperty(v) ? nodes[v][LABEL] : v)).join("/")

const renderers = {
	"http://schema.org/Thing"({
		path,
		depth,
		props,
		children,
		onExplore,
		explorer,
		graph,
		root,
		focused,
		onFocus,
	}: ViewProps) {
		const name = getConstant(props["http://schema.org/name"]) as string
		const alternateName = getConstant(props["http://schema.org/alternateName"])
		const url = getConstant(props["http://schema.org/url"]) as string
		const description = getConstant(props["http://schema.org/description"])
		const realId = makeId(path)
		const exp = explorer.find(list => makeId(list.slice(1)) === realId)

		const boxShadow =
			(!root || depth > 2) && exp && focused === realId
				? `0px 0px 5px 5px ${exp.get(0)}`
				: null
		const isOpened = !!exp
		const go = root || !isOpened || true

		let citations = null
		const position = "http://schema.org/position"
		const citationProperty = "http://schema.org/citation"
		if (props.hasOwnProperty(citationProperty)) {
			const value = props["http://schema.org/citation"]
			const values = Array.isArray(value) ? value : [value]
			citations = values.map((value, key) => {})
			let resolveIndex = (number: number) => number
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
				resolveIndex = number =>
					values.findIndex(value => getConstant(value[position]) === number)
			}
			citations = resolvedValues.map(([props, value]: ResolvedValue, key) => {
				const type = value[TYPE]
				const properties = {
					path: value.hasOwnProperty(ID)
						? [value[ID]]
						: path.concat([citationProperty, resolveIndex(key).toString()]),
					key,
					type,
					graph,
					props,
					depth: depth + 1,
					root: false,
					explorer,
					onExplore,
					focused,
					onFocus,
				}
				return <View {...properties} />
			})
		}

		const header = `h${Math.min(6, depth + 1)}`
		return (
			<div
				onMouseEnter={event => onFocus(realId)}
				onMouseLeave={event => onFocus(null)}
				className="carousel-item"
				style={boxShadow ? { boxShadow } : {}}
			>
				{renderHeader(name, depth, () => onExplore(path), !root, isOpened)}
				{go && alternateName && depth < 3 && <h3>{alternateName}</h3>}
				{go && url && depth < 3 && <a href={url}>{url}</a>}
				{go && description && depth < 3 && <p>{description}</p>}
				{/* {go && renderSource(source)} */}
				{go && children}
				{citations && (
					<Fragment>
						{React.createElement(header, {}, ["References"])}
						<div className="carousel">{citations}</div>
					</Fragment>
				)}
			</div>
		)
	},
	"http://schema.org/CreativeWork"({
		path,
		graph,
		depth,
		props,
		children,
		...rest
	}: ViewProps) {
		let associatedMedia = null
		const associatedMediaProperty = "http://schema.org/associatedMedia"
		let value = props[associatedMediaProperty]
		const position = "http://schema.org/position"
		if (value) {
			const values = Array.isArray(value) ? value : [value]
			let resolveIndex = (number: number) => number
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
				resolveIndex = number =>
					values.findIndex(value => getConstant(value[position]) === number)
			}
			associatedMedia = resolvedValues.map(
				([props, value]: ResolvedValue, key) => {
					const type = value[TYPE]
					const properties = {
						...rest,
						path: value.hasOwnProperty(ID)
							? [value[ID]]
							: path.concat([
									associatedMediaProperty,
									resolveIndex(key).toString(),
							  ]),
						key,

						type,
						graph,
						props,
						depth: depth + 1,
						root: false,
					}
					return <View {...properties} />
				}
			)
		}
		let author = null
		const authorProperty = "http://schema.org/author"
		value = props[authorProperty]
		if (value) {
			const values = Array.isArray(value) ? value : [value]
			let resolveIndex = (number: number) => number
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
				resolveIndex = number =>
					values.findIndex(value => getConstant(value[position]) === number)
			}
			author = resolvedValues.map(([props, value]: ResolvedValue, key) => {
				const type = value[TYPE]
				const properties = {
					...rest,
					path: value.hasOwnProperty(ID)
						? [value[ID]]
						: path.concat([authorProperty, resolveIndex(key).toString()]),
					key,
					type,
					graph,
					props,
					depth: depth + 1,
					root: false,
				}
				return <View {...properties} />
			})
		}
		const header = `h${Math.min(6, depth + 1)}`
		return (
			<Fragment>
				{author && (
					<Fragment>
						{React.createElement(header, {}, ["Authors"])}
						<div className="carousel">{author}</div>
					</Fragment>
				)}
				{associatedMedia &&
					depth < 3 && (
						<Fragment>
							{React.createElement(header, {}, ["Associated media"])}
							<div className="carousel">{associatedMedia}</div>
						</Fragment>
					)}
				{children}
			</Fragment>
		)
	},
	"http://schema.org/MediaObject"({ props, children, depth }: ViewProps) {
		const content = "http://schema.org/contentUrl"
		const format = "http://schema.org/encodingFormat"
		const mime = getConstant(props[format]) as string
		const src = getConstant(props[content]) as string
		const display = mime && src
		return (
			<Fragment>
				{display &&
					(mediaRenderers.hasOwnProperty(mime) &&
						mediaRenderers[mime](mime, src, depth))}
				{children}
			</Fragment>
		)
	},
	// "http://schema.org/Place"({ props, graph, children }: ViewProps) {
	// 	const geo = "http://schema.org/geo"
	// 	const lat = "http://schema.org/latitude"
	// 	const long = "http://schema.org/longitude"
	// 	let map = null
	// 	if (props.hasOwnProperty(geo)) {
	// 		const value = props[geo]
	// 		const values = Array.isArray(value) ? value : [value]
	// 		map = values.map((value: SourcedInline, key) => {
	// 			const source = value[SOURCE]
	// 			const props = resolve(value, graph)
	// 			const raw = [props[lat], props[long]]
	// 			const [latitude, longitude] = raw.map(getConstant) as [number, number]
	// 			if (latitude && longitude) {
	// 				const properties = { key, latitude, longitude, scale: 3 }
	// 				return (
	// 					<Fragment>
	// 						<MapView {...properties} />
	// 						{renderSource(source)}
	// 					</Fragment>
	// 				)
	// 			} else return null
	// 		})
	// 	}
	// 	return (
	// 		<Fragment>
	// 			<p>And i'm a place</p>
	// 			{map}
	// 			{children}
	// 		</Fragment>
	// 	)
	// },
	"http://schema.org/Person"({
		props,
		graph,
		depth,
		children,
		path,
		type,
		...rest
	}: ViewProps) {
		const affiliationProperty = "http://schema.org/affiliation"
		const value = props[affiliationProperty]
		const values = value ? (Array.isArray(value) ? value : [value]) : null

		const affiliations = values
			? values.map((value, key) => {
					const type = value[TYPE]
					const props = resolve(
						value as SourcedInline | SourcedReference,
						graph
					)
					if (props) {
						const properties = {
							...rest,
							key,
							props,
							graph,
							type,
							depth: depth + 1,
							path: path.concat(["affiliation", key.toString()]),
							root: false,
						}
						return <View {...properties} />
					} else return null
			  })
			: null

		const header = `h${Math.min(6, depth + 1)}`
		return (
			<Fragment>
				{affiliations &&
					depth < 4 &&
					React.createElement(header, {}, ["Affiliation"])}
				{depth < 4 && affiliations}
				{children}
			</Fragment>
		)
	},
}

export function View({ depth, type, ...rest }: ViewProps) {
	const ancestors = enumerateAncestry(type, SUBCLASS)
	const children = ancestors.reduce((child, type, key) => {
		if (renderers.hasOwnProperty(type)) {
			const properties: ViewProps = { ...rest, key, type, depth: depth + 1 }
			return React.createElement(renderers[type], properties, [child])
		} else {
			return child
		}
	}, null)
	return <div>{children}</div>
}

const mediaRenderers: {
	[mime: string]: (
		encodingFormat: string,
		contentUrl: string,
		depth: number
	) => JSX.Element
} = {
	"text/csv"(encodingFormat: string, contentUrl: string) {
		console.log("fetching", contentUrl)
		fetch(contentUrl)
			.then(response => response.text())
			.then(text => console.log())
		return <TableView contentUrl={contentUrl} />
	},
	"application/pdf"(encodingFormat: string, contentUrl: string, depth: number) {
		const className = depth > 2 ? "small" : depth > 1 ? "medium" : "large"
		return (
			<object className={className} data={contentUrl} type={encodingFormat} />
		)
	},
	"image/jpeg"(encodingFormat: string, contentUrl: string, depth: number) {
		const className =
			depth > 2 ? "image" : depth > 1 ? "medium image" : "full image"
		return <img className={className} src={contentUrl} />
	},
}
