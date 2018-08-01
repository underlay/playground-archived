import React, { ChangeEvent, Fragment } from "react"
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
	hash: string
}
interface SelectState {
	search: string
	focus: number
	focused: boolean
	results: List<Entry>
}

export default class Select extends React.Component<SelectProps, SelectState> {
	private input: HTMLInputElement
	private results: HTMLDivElement
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
	private keyHandlers: {
		[keyCode: number]: (state: SelectState) => void
	} = {
		// enter
		13: ({ focus, results }) => {
			if (focus < results.size) {
				const { id } = results.get(focus)
				this.handleSubmit(id)
			}
		},
		// up arrow
		40: ({ focus, results: { size } }) => {
			const newFocus = size ? (focus + 1) % size : 0
			this.setState({ focus: newFocus })
			const target = this.results.children[0].children[newFocus]
			this.scrollIntoView(target as HTMLDivElement)
		},
		// down arrow
		38: ({ focus, results: { size } }) => {
			const newFocus = size ? (size + focus - 1) % size : 0
			this.setState({ focus: newFocus })
			const target = this.results.children[0].children[newFocus]
			this.scrollIntoView(target as HTMLDivElement)
		},
	}
	private static scrollMargin = 8
	private scrollIntoView(target: HTMLDivElement) {
		const offset = target.offsetTop - Select.scrollMargin
		const position = offset - this.results.scrollTop
		if (position - target.offsetHeight < 0) {
			this.results.scrollTop = offset - target.offsetHeight
		} else if (position > this.results.offsetHeight) {
			this.results.scrollTop = offset - this.results.offsetHeight
		}
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
		const { focused, search } = this.state
		const handle = f => () => focused !== f && this.setState({ focused: f })
		return (
			<React.Fragment>
				<div className="select-header">
					<input
						type="text"
						className="search"
						placeholder={this.props.placeholder}
						ref={input => (this.input = input)}
						autoFocus={true}
						value={search}
						onChange={this.handleChange}
						onFocus={handle(true)}
						onBlur={handle(false)}
						onKeyDown={event => {
							const { keyCode } = event
							if (this.keyHandlers.hasOwnProperty(keyCode)) {
								event.preventDefault()
								this.keyHandlers[keyCode](this.state)
							}
						}}
					/>
					{this.props.children}
				</div>
				{focused && this.renderResults()}
			</React.Fragment>
		)
	}
	renderResults() {
		const content =
			this.state.results.size > 0
				? this.state.results.map(this.renderResult)
				: this.emptySearch
		return (
			<Fragment>
				<div className="select">
					<div ref={div => (this.results = div)} className="results">
						<div className="scroller">{content}</div>
					</div>
					<div className="description">{this.renderDescription()}</div>
				</div>
				<hr />
			</Fragment>
		)
	}
	renderResult(entry: Entry, key: number) {
		const focus = key === this.state.focus ? "focus mono" : "mono"
		const handleFocus = event => {
			if (this.state.focus !== key && this.results) {
				this.setState({ focus: key })
				this.scrollIntoView(event.target)
				// window.location.hash = this.props.hash + "/" + key
			}
		}
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
					<h1 className="mono">{entry.name}</h1>
					{entry.category && (
						<React.Fragment>
							<div>
								Inherited from{" "}
								<span className="mono">{nodes[entry.category][LABEL]}</span>
							</div>
							<div>
								Range:{" "}
								{flattenValues(nodes[entry.id][RANGE]).map((type, key) => (
									<Fragment key={key}>
										{key ? ", " : null}
										<span className="mono">{nodes[type][LABEL]}</span>
									</Fragment>
								))}
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
