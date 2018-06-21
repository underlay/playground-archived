import React, { Fragment } from "react"
import * as d3_geo from "d3-geo"
import * as d3_selection from "d3-selection"
import * as topojson from "topojson"
const topo = require("us-atlas/us/10m.json")
const d3 = { ...d3_geo, ...d3_selection }

interface MapProps {
	latitude: number
	longitude: number
	scale: number
}

export default class MapView extends React.Component<MapProps> {
	private static initialWidth = 960
	private static initialHeight = 600
	componentDidMount() {
		const { scale, longitude, latitude } = this.props
		const svg = d3.select("svg")
		const width = +svg.attr("width")
		const height = +svg.attr("height")
		const projection = d3
			.geoAlbersUsa()
			.scale(1280 / this.props.scale)
			.translate([width / 2, height / 2])

		const translate = projection([longitude, latitude])

		const path = d3.geoPath()
		const states = topojson.feature(topo, topo.objects.states).features

		svg
			.append("g")
			.attr("transform", `scale(${1 / scale})`)
			.attr("class", "states")
			.selectAll("path")
			.data(states)
			.enter()
			.append("path")
			.attr("d", path)

		svg
			.append("path")
			.attr("transform", `scale(${1 / scale})`)
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
		const { longitude, latitude, scale } = this.props
		if (longitude && latitude) {
			const width = MapView.initialWidth / scale
			const height = MapView.initialHeight / scale
			return <svg id="map" width={width} height={height} />
		} else {
			return null
		}
	}
}
