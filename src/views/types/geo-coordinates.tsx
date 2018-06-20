import React from "react"
import * as d3_geo from "d3-geo"
import * as d3_selection from "d3-selection"
import * as topojson from "topojson"
import { getConstant, ValueProps, getNodeValues } from ".."
const topo = require("us-atlas/us/10m.json")
const d3 = { ...d3_geo, ...d3_selection }

interface GeoState {
	coordinates: [number, number]
	scale: number
}

export default class GeoCoordinates extends React.Component<
	ValueProps,
	GeoState
> {
	private static initialWidth = 960
	private static initialHeight = 600
	constructor(props: ValueProps) {
		super(props)
		const geo = getNodeValues([props.value], props.graph)
		const state: GeoState = { scale: 3, coordinates: null }
		if (geo !== null) {
			const latitude = getConstant(geo["http://schema.org/latitude"])
			const longitude = getConstant(geo["http://schema.org/longitude"])
			if (latitude && longitude) {
				state.coordinates = [longitude, latitude] as [number, number]
			}
		}
		this.state = state
	}
	componentDidMount() {
		if (this.state.coordinates === null) return
		const svg = d3.select("svg")
		const width = +svg.attr("width")
		const height = +svg.attr("height")
		const projection = d3
			.geoAlbersUsa()
			.scale(1280 / this.state.scale)
			.translate([width / 2, height / 2])

		const translate = projection(this.state.coordinates)

		const path = d3.geoPath()
		const states = topojson.feature(topo, topo.objects.states).features

		svg
			.append("g")
			.attr("transform", `scale(${1 / this.state.scale})`)
			.attr("class", "states")
			.selectAll("path")
			.data(states)
			.enter()
			.append("path")
			.attr("d", path)

		svg
			.append("path")
			.attr("transform", `scale(${1 / this.state.scale})`)
			.attr("class", "state-borders")
			.attr(
				"d",
				path(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
			)

		svg
			.append("circle")
			// .attr("transform", `scale(${1 / this.state.scale})`)
			.attr("r", 5)
			.attr("fill", "red")
			.attr("transform", () => `translate(${translate})`)
	}
	render() {
		if (this.state.coordinates) {
			const width = GeoCoordinates.initialWidth / this.state.scale
			const height = GeoCoordinates.initialHeight / this.state.scale
			return <svg id="map" width={width} height={height} />
		} else {
			return null
		}
	}
}
