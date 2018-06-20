import React from "react"
import { ValueProps, getConstant } from "../index"

const renderers = {
	"text/csv"(encodingFormat: string, contentUrl: string) {},
	"application/pdf"(encodingFormat: string, contentUrl: string) {
		const style = encodingFormat === "application/pdf" ? { height: 480 } : {}
		return <object style={style} data={contentUrl} type={encodingFormat} />
	},
	"image/jpeg"(encodingFormat: string, contentUrl: string) {
		return <img style={{ width: 480 }} src={contentUrl} />
	},
}

export default function MediaObject(props: ValueProps) {
	const name = "http://schema.org/name"
	const alternate = "http://schema.org/alternateName"
	const content = "http://schema.org/contentUrl"
	const format = "http://schema.org/encodingFormat"
	const description = "http://schema.org/description"
	const title = getConstant(props.value[name]) as string
	const mime = getConstant(props.value[format]) as string
	const src = getConstant(props.value[content]) as string
	const subtitle = getConstant(props.value[alternate]) as string
	const caption = getConstant(props.value[description]) as string

	if (mime && src) {
		return (
			<div>
				{title && <h3>{title}</h3>}
				{subtitle && <h4>{subtitle}</h4>}
				{renderers["application/pdf"](mime, src)}
				{/* {renderers.hasOwnProperty(mime) && renderers[mime](mime, src)} */}
				{caption && <p>{caption}</p>}
			</div>
		)
	} else {
		return null
	}
}
