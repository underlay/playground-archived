import React, { Fragment } from "react"
import { Map, List } from "immutable"
import { Buffer } from "buffer"
import multihashing from "multihashing"
import multihash from "multihashes"
import niceware from "niceware"

import {
	Assertion,
	ID,
	TYPE,
	TIME,
	VALUE,
	SOURCE,
	things,
	ancestry,
	enumerateProperties,
	GRAPH,
	CONTEXT,
	Values,
	AssertionNode,
} from "./schema"
import Select from "./select"
import FormView, {
	FormValue,
	Constant,
	Reference,
	Inline,
	FormProps,
	FormValues,
} from "./form"

interface UndergroundProps {
	onSubmit: (assertion: Assertion, hash: string) => void
}

interface UndergroundState {
	hash: string
	graph: Map<string, string[]> // id -> types
	forms: Map<string, Map<string, List<FormValue>>> // id -> properties
}

type EntrySeq = [string, FormValue[]]

export default class Underground extends React.Component<
	UndergroundProps,
	UndergroundState
> {
	private static createCatalog: List<List<string>> = List(
		Array.from(things).map(id => List([id]))
	)
	private static createId() {
		return niceware.generatePassphrase(4).join("-")
	}
	private static generateProperties(types: string[]): List<List<string>> {
		const set: Set<string> = new Set()
		return List(
			types.reduce((props: List<List<string>>, type) => {
				return props.concat(
					Array.from(ancestry[type]).reduce(
						(props: List<List<string>>, type) =>
							props.concat(
								enumerateProperties(type)
									.filter(prop => !set.has(prop) && !!set.add(prop))
									.map(prop => List([prop, type]))
							),
						List([])
					)
				)
			}, List([]))
		)
	}
	private static key = "http://underlay.mit.edu"
	private source: string
	constructor(props) {
		super(props)
		window.location.hash = "new"
		this.state = {
			hash: location.hash.slice(1),
			graph: Map({}),
			forms: Map({}),
		}
		this.exportNode = this.exportNode.bind(this)
		this.accumulateNode = this.accumulateNode.bind(this)
		this.handleSubmit = this.handleSubmit.bind(this)
		if (localStorage.hasOwnProperty(Underground.key)) {
			this.source = localStorage[Underground.key]
		} else {
			this.source = niceware.generatePassphrase(4).join("-")
			localStorage[Underground.key] = this.source
		}
	}
	componentDidMount() {
		window.addEventListener("hashchange", () => {
			if (location.hash.indexOf(this.state.hash) !== 1) {
				this.setState({ hash: location.hash.slice(1) })
			}
		})
	}
	renderFileInput() {
		return (
			<input
				className="file-input"
				type="file"
				accept="application/json"
				onChange={event => this.readFile(event)}
			/>
		)
	}
	render() {
		const { forms, graph } = this.state
		const disabled = forms.size === 0
		return (
			<Fragment>
				<Select
					placeholder="Create a new object by type"
					catalog={Underground.createCatalog}
					onSubmit={type => this.createNode([type])}
					hash={this.state.hash}
				>
					{this.renderFileInput()}
				</Select>
				<form onSubmit={this.handleSubmit}>
					<div className="container">
						{this.state.forms
							.entrySeq()
							.map(([id, form]: [string, FormValues]) => {
								const formProps: FormProps = {
									id,
									graph,
									form,
									createNode: types => this.createNode(types),
									onRemove: () => this.removeForm(id),
									onChange: (
										form: FormValues,
										newId?: string,
										newForm?: FormValues
									) => {
										const forms = this.state.forms.set(id, form)
										if (newId && newForm) {
											this.setState({ forms: forms.set(newId, newForm) })
										} else {
											this.setState({ forms })
										}
									},
								}
								return <FormView key={id} {...formProps} />
							})}
					</div>
					<input
						disabled={disabled}
						type="button"
						value="Submit"
						onClick={event => this.handleSubmit(event, true)}
					/>
					<input disabled={disabled} type="submit" value="Download" />
				</form>
			</Fragment>
		)
	}
	private removeForm(id: string) {
		const forms = this.state.forms.delete(id)
		this.setState({ forms })
	}
	private setHash(hash: string) {
		this.setState({ hash }, () => (window.location.hash = hash))
	}
	private createNode(type: string[]): string {
		const id = Underground.createId()
		const forms = this.state.forms.set(id, Map({}))
		const graph = this.state.graph.set(id, type)
		this.setState({ forms, graph })
		this.setHash(id)
		return id
	}
	private accumulateNode(acc: Map<string, Values>, elm: EntrySeq) {
		const [property, values] = elm
		const objects = values.map(formValue => {
			const { value, type, constant, reference, inline } = formValue
			const node = { [TYPE]: type }
			if (value === Constant) {
				const result = constant
					? JSON.parse(constant)
					: FormView.defaultValues.hasOwnProperty(formValue.type)
						? FormView.defaultValues[formValue.type]
						: null
				node[VALUE] = result
			} else if (value === Reference) {
				node[ID] = reference || null
			} else if (value === Inline) {
				inline
					.entrySeq()
					.map(([prop, vals]) => [prop, vals.toArray()])
					.reduce(this.accumulateNode, Map())
					.forEach((value, key) => (node[key] = value))
			}
			return node
		})
		return acc.set(property, objects as Values)
	}
	private exportNode([id, props]: [string, EntrySeq[]]): AssertionNode {
		const type = this.state.graph.get(id)
		const properties = props.reduce(this.accumulateNode, Map({}))
		return { [ID]: id, [TYPE]: type, ...properties.toJS() }
	}
	private handleSubmit(event, download?: boolean) {
		event.preventDefault()
		const date = new Date()
		const time = date.toISOString()
		const data = { [TIME]: time, [SOURCE]: this.source }
		const nodes = this.state.forms.map(props => props.entrySeq()).entrySeq()
		const graph = nodes.map(this.exportNode).toJS()
		const assertion: Assertion = { [CONTEXT]: {}, [GRAPH]: graph, ...data }
		const json = JSON.stringify(assertion)
		const bytes = Buffer.from(json, "utf8")
		const mhash = multihashing(bytes, "sha1")
		const hash = multihash.toB58String(mhash)
		this.importAssertion(assertion, hash)
		this.setState({ forms: Map({}), graph: Map({}) })
		if (!download) {
			this.props.onSubmit(assertion, hash)
		}
	}
	private readFile(event) {
		event.preventDefault()
		const { files } = event.target
		console.log(files)
		if (files && files.length > 0) {
			Array.from(files).forEach((file: File) => {
				const test = /^([0-9A-Za-z]+)\.json$/
				if (file.type === "application/json" && test.test(file.name)) {
					const [match, hash] = test.exec(file.name)
					// if (this.state.assertions.has(hash)) {
					// 	window.alert("You've already imported this assertion!")
					// } else {
					this.importFile(hash, file)
					// }
				}
			})
		}
	}
	private importFile(hash: string, file: File) {
		const reader = new FileReader()
		let data
		reader.onloadend = () => {
			const text = reader.result
			try {
				data = JSON.parse(text)
			} catch (e) {
				console.error("could not parse text", text, e)
			}
			this.importAssertion(data, hash)
		}
		reader.readAsText(file)
	}
	private importAssertion(assertion: Assertion, hash: string) {
		// const assertions = this.state.assertions.set(hash, assertion)
		// const graph = assertion[GRAPH].reduce((graph, node) => {
		// 	const { [ID]: id, [TYPE]: type, ...rest } = node
		// 	const props: { [prop: string]: SourcedValues } = {}
		// 	Object.keys(rest).forEach(prop => {
		// 		const values = (Array.isArray(node[prop])
		// 			? node[prop]
		// 			: [node[prop]]) as Values
		// 		props[prop] = values.map(value => ({ ...value, [SOURCE]: hash }))
		// 	})
		// 	if (graph.has(id)) {
		// 		const sourced = graph.get(id)
		// 		Object.keys(props).forEach(prop => {
		// 			if (sourced.hasOwnProperty(prop)) {
		// 				const value = sourced[prop] as SourcedValues
		// 				sourced[prop] = value.concat(props[prop])
		// 			} else {
		// 				sourced[prop] = props[prop]
		// 			}
		// 		})
		// 		return graph.set(id, sourced)
		// 	} else {
		// 		return graph.set(id, { [ID]: id, [TYPE]: type, ...props })
		// 	}
		// }, this.state.graph)
		// this.setState({ graph, assertions })
	}
}
