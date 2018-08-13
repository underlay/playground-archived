import React, { ChangeEvent, Fragment } from "react"
import { List } from "immutable"
import Fuse from "fuse.js"
import { nodes, flattenValues } from "./schema"
import { LABEL, COMMENT, RANGE, SUBCLASS, TYPE } from "./utils/constants"
import { unstable_renderSubtreeIntoContainer } from "react-dom"

interface Entry {
	id: string
	name: string
	size: number
	elder: number
	index: number
	parent: number
	parents: string[]
	category: string
	expanded: boolean
	description: string
}

interface SelectProps {
	placeholder?: string
	parentProperty: string
	parentDescription: string
	childDescription: string
	catalog: List<List<string>>
	inheritance: { [type: string]: Set<string> }
	onSubmit: (id: string) => void
}

interface SelectState {
	catalog: List<Entry>
	roots: List<number>
	index: any // fuse.js object
	value: string
	focus: number
	focused: boolean
	results: List<number> // List of indices
}

export default class Select extends React.Component<SelectProps, SelectState> {
	private input: HTMLInputElement
	private results: HTMLDivElement
	private attachInput = input => (this.input = input)
	private static emptySearch = "No results"
	private static fuseOptions = {
		id: "index",
		shouldSort: true,
		location: 0,
		threshold: 0.3,
		keys: [{ name: "name", weight: 0.8 }, { name: "description", weight: 0.2 }],
	}
	constructor(props: SelectProps) {
		super(props)
		this.state = Object.assign(
			{
				catalog: null,
				roots: null,
				index: null,
				// These are true
				value: "",
				focus: 0,
				focused: true,
				results: null,
			},
			this.updateIndex()
		)
		this.input = null
	}
	componentDidUpdate(prevProps, prevState) {
		if (prevProps.catalog !== this.props.catalog) {
			this.setState(this.updateIndex)
		}
	}
	updateIndex() {
		const catalog = []
		const roots: number[] = []
		this.props.catalog.forEach(record => {
			roots.push(catalog.length)
			Select.parseCatalog(record, catalog, 0, this.props.inheritance)
		})
		;(window as any).catalog = catalog
		return {
			catalog: List(catalog),
			index: new Fuse(catalog, Select.fuseOptions),
			roots: List(roots),
		}
	}
	private static parseCatalog(
		record: List<string>,
		catalog: Entry[],
		depth: number,
		inheritance: { [id: string]: Set<string> }
	) {
		const id = record.get(0)
		const node = nodes[id]
		const entry: Entry = {
			id,
			name: node[LABEL],
			size: null,
			elder: null,
			index: null,
			parent: null,
			parents: flattenValues(node[SUBCLASS]),
			category: record.get(1) || null,
			expanded: depth < 1,
			description: node[COMMENT],
		}
		let length = catalog.push(entry)
		let index = length - 1
		entry.index = index
		entry.parent = index // Will overwrite except for roots
		// I'm really sorry about all this.
		// I picked the wrong abstractions a while ago and now we all have to suffer.
		inheritance[id].forEach(id => {
			// Here `length` is the root of the current subtree,
			// and `index` is the root of the elder == "previous-sibling-or-parent" subtree
			Select.parseCatalog(List([id]), catalog, depth + 1, inheritance)
			const root = catalog[length]
			root.parent = entry.index
			root.elder = index
			index = length
			length += root.size
		})
		// Hackiness aside, this is actually a really fast way to build an index like this.
		// It's a like a doubly-linked list, except it's a triply-linked tree.
		// And we never have to modify it.
		entry.size = catalog.length - entry.index
	}
	render() {
		const { focused, value } = this.state
		return (
			<React.Fragment>
				<div className="select-header">
					<input
						type="text"
						className="search"
						placeholder={this.props.placeholder}
						ref={this.attachInput}
						autoFocus={true}
						value={value}
						onChange={this.handleChange}
						onFocus={this.onInputFocus}
						onBlur={this.onInputBlur}
						onKeyDown={this.onKeyDown}
					/>
					{this.props.children}
				</div>
				{focused && this.renderContainer()}
			</React.Fragment>
		)
	}
	renderContainer() {
		return (
			<Fragment>
				<div className="select">
					<div ref={div => (this.results = div)} className="results">
						<div className="scroller">{this.renderContent()}</div>
					</div>
					<div className="description">{this.renderDescription()}</div>
				</div>
				<hr />
			</Fragment>
		)
	}
	renderContent() {
		const { roots, results, value, catalog } = this.state
		if (!value || !results) return this.renderTrees(roots)
		if (results.size === 0) return <p>{Select.emptySearch}</p>
		else
			return results.map((result, index) =>
				this.renderItem(index, catalog.get(result))
			)
	}
	renderTrees(indices: List<number>) {
		const results = []
		indices.forEach(index => this.renderTree(index, results, 0))
		return results
	}
	renderTree(index: number, results: any[], depth: number) {
		const entry = this.state.catalog.get(index)
		const delta = index - results.length
		const expanded = this.isExpanded(entry, depth)
		results.push(expanded ? this.renderItem(index, entry, depth) : null)
		const { size } = this.props.inheritance[entry.id]
		for (let i = 0; i < size; i++) {
			this.renderTree(results.length + delta, results, depth + 1)
		}
	}
	renderItem(index: number, entry: Entry, depth?: number) {
		const className = index === this.state.focus ? "focus mono" : "mono"
		const handleFocus = () => {
			if (this.state.focus !== index) {
				this.setState({ focus: index })
			}
		}
		return (
			<div
				key={index}
				className="result"
				onMouseEnter={handleFocus}
				onMouseMove={handleFocus}
				onMouseDown={event => {
					event.preventDefault()
					this.handleSubmit(entry.id)
				}}
			>
				{this.renderSpacer(entry, depth)}
				<span className={className}>{entry.name}</span>
			</div>
		)
	}
	renderSpacer(entry: Entry, depth?: number) {
		if (!isNaN(depth)) {
			const signal = entry.size > 1 ? (entry.expanded ? "○" : "●") : " "
			const content = "  ".repeat(depth) + signal + " "
			return <span className="spacer">{content}</span>
		} else return null
	}
	renderDescription() {
		const { catalog, focus, results } = this.state
		const index = results === null ? focus : results.get(focus)
		const entry = catalog.get(index)
		if (entry) {
			return (
				<React.Fragment>
					<h1 className="mono">{entry.name}</h1>
					{this.renderInheritance(entry)}
					{this.renderParents(entry)}
					{this.renderChildren(entry)}
					{this.renderRange(entry)}
					<hr />
					<div dangerouslySetInnerHTML={{ __html: entry.description }} />
				</React.Fragment>
			)
		}
	}
	renderInheritance(entry: Entry) {
		if (entry.category) {
			return (
				<React.Fragment>
					<div>
						Inherited from{" "}
						<span className="mono">{nodes[entry.category][LABEL]}</span>
					</div>
				</React.Fragment>
			)
		}
	}
	renderRange(entry: Entry) {
		if (nodes[entry.id][TYPE] === "rdf:Property")
			return (
				<div>
					Range:{" "}
					<span className="mono">
						{flattenValues(nodes[entry.id][RANGE])
							.filter(id => nodes[id])
							.map(id => nodes[id][LABEL])
							.join(", ")}
					</span>
				</div>
			)
		else return null
	}
	renderParents(entry: Entry) {
		const { parentDescription, parentProperty } = this.props
		const values = nodes[entry.id][parentProperty]
		return values ? (
			<div>
				{parentDescription} of{" "}
				<span className="mono">
					{flattenValues(values)
						.filter(id => nodes[id])
						.map(id => nodes[id][LABEL])
						.join(", ")}
				</span>
			</div>
		) : null
	}
	renderChildren(entry: Entry) {
		const { childDescription, inheritance } = this.props
		if (inheritance[entry.id].size > 0) {
			const children = Array.from(inheritance[entry.id]).map(
				id => nodes[id][LABEL]
			)
			return (
				<div>
					{childDescription}:{" "}
					<span className="mono">{children.join(", ")}</span>
				</div>
			)
		} else return null
	}
	// Events
	private handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { value } = event.target
		const isEmpty = /^\s*$/.test(value)
		const results: List<number> = isEmpty
			? null
			: List(this.state.index.search(value))
		this.setState({ value, results, focus: 0 })
	}
	private handleSubmit = (id: string) => {
		this.setState(
			{ value: "", results: null, focused: false },
			() => this.input && this.input.blur()
		)
		this.props.onSubmit(id)
	}
	private onInputFocus = () =>
		!this.state.focused && this.setState({ focused: true })
	private onInputBlur = () =>
		this.state.focused && this.setState({ focused: false })
	private onKeyDown = event => {
		const { keyCode } = event
		if (this.keyHandlers[keyCode]) {
			event.preventDefault()
			this.keyHandlers[keyCode](this.state)
		}
	}
	private keyHandlers: {
		[keyCode: number]: (state: SelectState) => void
	} = {
		13: ({ focus, results, catalog }) => {
			// enter
			const index = results !== null ? results.get(focus) : focus
			const { id } = catalog.get(index)
			this.handleSubmit(id)
		},
		40: ({ focus, results, catalog }) => {
			// down arrow
			if (results !== null) {
				this.setState({ focus: (focus + 1) % results.size })
			} else {
				const { expanded, size } = catalog.get(focus)
				const delta = expanded ? 1 : size
				const newFocus = focus + delta
				if (newFocus < catalog.size) {
					this.setState({ focus: newFocus }, () =>
						this.scrollIntoView(newFocus)
					)
				}
			}
		},
		39: ({ focus, catalog, results }) => {
			// right arrow
			if (results === null) {
				const entry = catalog.get(focus)
				if (entry.size > 1) {
					entry.expanded = true
					const newFocus = focus + 1
					this.setState({ focus: newFocus }, () =>
						this.scrollIntoView(newFocus)
					)
				}
			}
		},
		38: ({ focus, results, catalog }) => {
			// up arrow
			if (results !== null) {
				this.setState({ focus: (results.size + focus - 1) % results.size })
			} else if (focus > 0) {
				let previous = catalog.get(focus - 1)
				while (!this.isExpanded(previous)) {
					previous = catalog.get(previous.index - 1)
				}
				const newFocus = previous.index
				this.setState({ focus: newFocus }, () => this.scrollIntoView(newFocus))
			}
		},
		37: ({ focus, catalog, results }) => {
			// left arrow
			if (results === null) {
				const entry = catalog.get(focus)
				if (entry.index !== entry.parent) {
					const parent = catalog.get(entry.parent)
					parent.expanded = false
					const newFocus = parent.index
					this.setState({ focus: newFocus }, () =>
						this.scrollIntoView(newFocus)
					)
				}
			}
		},
	}
	private scrollIntoView(newFocus: number) {
		return
		// const target = this.results.children[0].children[newFocus] as HTMLDivElement
		// const offset = target.offsetTop - this.results.offsetTop
		// const position = offset - this.results.scrollTop
		// const height = this.results.offsetHeight - target.offsetHeight
		// if (position < 0) {
		// 	this.results.scrollTop = offset
		// } else if (position > height) {
		// 	this.results.scrollTop = offset - height
		// }
	}
	private isExpanded(entry: Entry, depth?: number): boolean {
		if (isNaN(depth)) depth = Infinity
		let parent = this.state.catalog.get(entry.parent)
		let expanded = parent.expanded || depth === 0
		while (parent.index !== parent.parent && --depth > 0) {
			parent = this.state.catalog.get(parent.parent)
			expanded = expanded && parent.expanded
		}
		return expanded
	}
}
