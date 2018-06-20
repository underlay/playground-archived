import React from "react"
import { ValueProps, getConstant } from "../index"

export default function MediaObject(props: ValueProps) {
	const content = "http://schema.org/contentUrl"
	const format = "http://schema.org/encodingFormat"

	const mime = getConstant(props.value[format]) as string
	const src = getConstant(props.value[content]) as string
	if (mime && src) {
		return (
			<object data={src} type={mime}>
				<embed src={src} type={mime} />
			</object>
		)
	} else {
		return null
	}
}
