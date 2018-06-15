import React, { ChangeEvent } from "react"
import { List } from "immutable"
import Fuse from "fuse.js"
import { nodes, LABEL, COMMENT, RANGE, flattenValues } from "./schema"

interface Entry {
	id: string
	name: string
	category: string
	description: string
}

interface SelectProps {
	placeholder?: string
	catalog: List<List<string>>
	onSubmit: (id: string) => void
}
interface SelectState {
	search: string
	focus: number
	focused: boolean
	results: List<Entry>
}

export default class Select extends React.Component<SelectProps, SelectState> {
	private input: HTMLInputElement
	private index: any
	private catalog: Entry[]
	private everything: List<Entry>
	private emptySearch = "No results"
	private static fuseOptions = {
		shouldSort: true,
		location: 0,
		threshold: 0.3,
		keys: [{ name: "name", weight: 0.8 }, { name: "description", weight: 0.2 }],
	}
	constructor(props: SelectProps) {
		super(props)
		this.catalog = this.props.catalog
			.map(record => {
				const id = record.get(0)
				const name = nodes[id][LABEL]
				const description = nodes[id][COMMENT]
				const category = record.size > 1 ? record.get(1) : null
				return { id, name, category, description }
			})
			.toArray()
		this.everything = List(this.catalog)
		this.index = new Fuse(this.catalog, Select.fuseOptions)
		this.state = {
			search: "",
			focus: 0,
			focused: true,
			results: this.everything,
		}
		this.input = null
		this.handleChange = this.handleChange.bind(this)
		this.renderResult = this.renderResult.bind(this)
	}
	render() {
		const { focused, results, search } = this.state
		return (
			<React.Fragment>
				<input
					type="text"
					className="search"
					placeholder={this.props.placeholder}
					ref={input => (this.input = input)}
					autoFocus={true}
					value={search}
					onChange={this.handleChange}
					onFocus={event => {
						if (!this.state.focused) this.setState({ focused: true })
					}}
					onBlur={event => {
						if (this.state.focused) this.setState({ focused: false })
					}}
					onKeyDown={event => {
						if (event.keyCode === 13) {
							// enter
							event.preventDefault()
							const { focus, results } = this.state
							if (focus < results.size) this.handleSubmit(results.get(focus).id)
						} else if (event.keyCode === 40) {
							// down arrow
							event.preventDefault()
							const { focus, results } = this.state
							const { size } = results
							const newFocus = size ? (focus + 1) % size : 0
							this.setState({ focus: newFocus })
						} else if (event.keyCode === 38) {
							// up arrow
							event.preventDefault()
							const { focus, results } = this.state
							const { size } = results
							const newFocus = size ? (size + focus - 1) % size : 0
							this.setState({ focus: newFocus })
						}
					}}
				/>
				{this.props.children}
				{focused && (
					<div className="select">
						<div className="results">
							<div className="scroller">
								{results.size
									? results.map(this.renderResult)
									: this.emptySearch}
							</div>
						</div>
						<div className="description">{this.renderDescription()}</div>
					</div>
				)}
			</React.Fragment>
		)
	}
	renderResult(entry: Entry, key: number) {
		const focus = key === this.state.focus ? "focus" : ""
		const handleFocus = (event: React.MouseEvent<HTMLDivElement>) =>
			this.state.focus !== key && this.setState({ focus: key })
		return (
			<div
				key={key}
				className="result"
				onMouseEnter={handleFocus}
				onMouseMove={handleFocus}
				onMouseDown={event => {
					event.preventDefault()
					this.handleSubmit(entry.id)
				}}
			>
				<span className={focus}>{entry.name}</span>
			</div>
		)
	}
	renderDescription() {
		const { results, focus } = this.state
		if (focus < results.size) {
			const entry = results.get(focus)
			return (
				<React.Fragment>
					<h1>{entry.name}</h1>
					{entry.category && (
						<React.Fragment>
							<div>Inherited from {nodes[entry.category][LABEL]}</div>
							<div>
								Range:{" "}
								{flattenValues(nodes[entry.id][RANGE])
									.map(type => nodes[type][LABEL])
									.join(", ")}
							</div>
						</React.Fragment>
					)}
					<hr />
					<div dangerouslySetInnerHTML={{ __html: entry.description }} />
				</React.Fragment>
			)
		}
	}
	handleChange(event: ChangeEvent<HTMLInputElement>) {
		const search = event.target.value
		const results: List<Entry> = /^\s*$/.test(search)
			? this.everything
			: List(this.index.search(search))
		this.setState({ search, results, focus: 0 })
	}
	handleSubmit(id: string) {
		this.setState(
			{
				search: "",
				results: this.everything,
				focused: false,
			},
			() => this.input && this.input.blur()
		)
		this.props.onSubmit(id)
	}
}
