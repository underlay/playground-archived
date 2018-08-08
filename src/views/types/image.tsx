import React, { Fragment } from "react"
import { Map } from "immutable"
import { ID, TYPE, VALUE } from "../../schema/constants"
import { SourcedNode, SourcedValues } from "../../schema/types"

interface ImageProps {
	node: SourcedNode
	graph: Map<string, SourcedNode>
}

export default function ImageView(props: ImageProps) {
	const { [ID]: id, [TYPE]: type, ...rest } = props.node
	const properties = rest as { [prop: string]: SourcedValues }
	const url = properties["http://schema.org/url"] || []
	const contentUrl = properties["http://schema.org/contentUrl"] || []
	const urls = url.concat(contentUrl).map(value => value[VALUE])
	return (
		<Fragment>{urls.map((src, key) => <img key={key} src={src} />)}</Fragment>
	)
}
