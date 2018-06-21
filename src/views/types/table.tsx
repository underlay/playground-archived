import React from "react"
import Papa from "papaparse"

interface TableProps {
	contentUrl: string
}
interface TableState {
	data: string[][]
}
export default class TableView extends React.Component<TableProps, TableState> {
	constructor(props) {
		super(props)
		this.state = { data: [] }
	}
	componentDidMount() {
		fetch(this.props.contentUrl)
			.then(response => response.text())
			.then(text => {
				const { data, errors } = Papa.parse(text)
				console.log(data, errors)
				if (errors.length === 0 && data) {
					this.setState({ data })
				}
			})
	}
	render() {
		return (
			<table className="table">
				<tbody>
					{this.state.data.map((row, i) => (
						<tr key={i}>
							{row.map((cell, j) =>
								React.createElement(i ? "td" : "th", { key: j }, [cell])
							)}
						</tr>
					))}
				</tbody>
			</table>
		)
	}
}
