import React from "react"
import { Map } from "immutable"
import * as d3_geo from "d3-geo"
import * as d3_selection from "d3-selection"
import * as topojson from "topojson"
import { SourcedNode } from "../schema"
const topo = require("us-atlas/us/10m.json")
const d3 = { ...d3_geo, ...d3_selection }

interface MapViewProps {
	objects: Map<string, SourcedNode>
}
interface MapViewState {}

export default class MapView extends React.Component<
	MapViewProps,
	MapViewState
> {
	private svg: any
	private projection: any
	constructor(props: MapViewProps) {
		super(props)
	}
	componentDidUpdate(prevProps, prevState, snapshot) {
		console.log(
			"the component did update",
			prevProps.objects,
			this.props.objects
		)
		if (prevProps.objects !== this.props.objects) {
			this.update(this.props.objects)
		}
	}
	componentDidMount() {
		this.svg = d3.select("svg")
		const width = +this.svg.attr("width")
		const height = +this.svg.attr("height")
		this.projection = d3
			.geoAlbersUsa()
			.scale(1280)
			.translate([width / 2, height / 2])
		const path = d3.geoPath() //.projection(projection)
		const states = topojson.feature(topo, topo.objects.states).features
		this.svg
			.append("g")
			.attr("class", "states")
			.selectAll("path")
			.data(states)
			.enter()
			.append("path")
			.attr("d", path)

		this.svg
			.append("path")
			.attr("class", "state-borders")
			.attr(
				"d",
				path(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
			)
		const ny = [-74.0059413, 40.7127837]

		this.svg
			.append("circle")
			.attr("r", 5)
			.attr("fill", "red")
			.attr("transform", () => `translate(${this.projection(ny)})`)
	}
	update(objects: Map<string, SourcedNode>) {
		const data = objects
			.valueSeq()
			.filter(object => object.hasOwnProperty("http://schema.org/geo"))
			.toJS()
		this.svg
			.selectAll("cicle")
			.data(data)
			.enter()
			.append("circle")
			.attr("r", 2)
			.attr("fill", "red")
			.attr("transform", object => {
				const id = object["http://schema.org/geo"][0]["@id"]
				const geo = objects.get(id)
				const latitude = geo["http://schema.org/latitude"][0]["@value"]
				const longitude = geo["http://schema.org/longitude"][0]["@value"]
				const coords = [longitude, latitude]
				return `translate(${this.projection(coords)})`
			})
	}
	render() {
		return <svg id="map" width="960" height="600" />
	}
}
