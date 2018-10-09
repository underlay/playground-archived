import React from "react"

export const primitives = new Set(["string", "number", "boolean"])

export const primitiveMap = {
	"http://www.w3.org/2001/XMLSchema#string": "string",
	"http://www.w3.org/2001/XMLSchema#integer": "number",
	"http://www.w3.org/2001/XMLSchema#double": "number",
	"http://www.w3.org/2001/XMLSchema#boolean": "boolean",
}

export const classTypes = {
	"http://www.w3.org/ns/prov#Agent": "agent",
	"http://www.w3.org/ns/prov#Person": "agent",
	"http://www.w3.org/ns/prov#SoftwareAgent": "agent",
	"http://www.w3.org/ns/prov#Entity": "entity",
	"http://www.w3.org/ns/prov#Activity": "activity",
}

export function getTableId(id) {
	return `table:${id}`
}

export function getContainerId(id) {
	return `container:${id}`
}

const TypeHeader = ({ types }) =>
	types.map((type, index, { length }) => (
		<tr>
			{index ? null : (
				<td rowSpan={length}>
					<strong>@type</strong>
				</td>
			)}
			<td colSpan="2">{type}</td>
		</tr>
	))

export function NodeView({
	node: {
		"@id": id,
		"@type": type,
		"@graph": graph,
		"@index": index,
		...properties
	},
	nodes,
	edges,
	compact,
}) {
	const typeHeader = Array.isArray(type) ? (
		<TypeHeader types={type.map(t => compact(t, true))} />
	) : null
	const isBlankNode = id.indexOf("_:") === 0
	const idHeader = isBlankNode ? null : (
		<tr>
			<td>
				<strong>@id</strong>
			</td>
			<td colSpan="2">{id}</td>
		</tr>
	)
	const rows = []
	Object.keys(properties).forEach(property => {
		const values = properties[property]
		const name = compact(property, true)
		const checkCollapsedLink = index =>
			edges[id] &&
			edges[id][property] &&
			edges[id][property].hasOwnProperty(index)
		values.forEach(
			({ "@id": id, "@type": type, "@value": value }, index, { length }) => {
				const isCollapsedLink = checkCollapsedLink(index)
				if (nodes.hasOwnProperty(id) && !isCollapsedLink) return

				const cells = []
				if (index === 0) {
					cells.push(
						<td
							key="0"
							className="property"
							itemProp={property}
							rowSpan={length}
						>
							{name}
						</td>
					)
				}

				const typeOfValue = typeof value
				const typeName = type ? (
					primitiveMap[type] ? (
						<span className="primitive">{primitiveMap[type]}</span>
					) : (
						compact(type, true)
					)
				) : primitives.has(typeOfValue) ? (
					<span className="primitive">{typeOfValue}</span>
				) : null

				cells.push(
					<td key="1" className="type">
						{typeName}
					</td>
				)

				if (primitives.has(typeOfValue)) {
					cells.push(
						<td key="2" className="value">
							{JSON.stringify(value)}
						</td>
					)
				} else if (isCollapsedLink) {
					cells.push(
						<td
							key="2"
							className="value"
							dangerouslySetInnerHTML={{
								__html: `<a onclick="console.log('wow')">${compact(
									id,
									false
								)}</a>`,
							}}
						/>
					)
				} else if (typeof id === "string") {
					cells.push(<td key="2">{compact(id, false)}</td>)
				}
				rows.push(<tr key={rows.length}>{cells}</tr>)
			}
		)
	})
	const hasDivider = (idHeader || typeHeader) && !!rows.length
	const itemType = type ? type.join(" ") : null
	const classes = new Set(["node"])
	if (type)
		type.forEach(
			type => classTypes.hasOwnProperty(type) && classes.add(classTypes[type])
		)
	const tableId = getTableId(id)
	return (
		<table
			className={Array.from(classes).join(" ")}
			id={tableId}
			itemScope
			itemType={itemType}
		>
			{idHeader}
			{typeHeader}
			{hasDivider && (
				<tr>
					<td colSpan="3">
						<hr />
					</td>
				</tr>
			)}
			{rows}
		</table>
	)
}
