import React, { Fragment } from "react"
import { Map, List } from "immutable"
import niceware from "niceware"
import {
	ID,
	TYPE,
	VALUE,
	GRAPH,
	CONTEXT,
	SUBCLASS,
	thing,
} from "./schema/constants"
import { AssertionGraph, Values, AssertionNode } from "./schema/types"
import Select from "./select"
import FormView, {
	FormValue,
	Constant,
	Reference,
	Inline,
	FormProps,
	FormValues,
} from "./form"
import { classInheritance } from "./schema"

export interface UndergroundProps {
	onSubmit: (assertion: AssertionGraph) => void
	onDownload: (assertion: AssertionGraph) => void
}

interface UndergroundState {
	graph: Map<string, string[]> // id -> types
	forms: Map<string, Map<string, List<FormValue>>> // id -> properties
}

type EntrySeq = [string, FormValue[]]

export default class Underground extends React.Component<
	UndergroundProps,
	UndergroundState
> {
	private static createId() {
		return niceware.generatePassphrase(4).join("-")
	}
	private static key = "http://underlay.mit.edu"
	private source: string
	constructor(props) {
		super(props)
		this.state = {
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
	render() {
		const { forms, graph } = this.state
		const disabled = forms.size === 0
		return (
			<Fragment>
				<Select
					parentDescription="Subclass"
					parentProperty={SUBCLASS}
					placeholder="Create a new object by type"
					catalog={List([List([thing])])}
					inheritance={classInheritance}
					childDescription="Children"
					onSubmit={type => this.createNode([type])}
				/>
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
									label: "Remove",
									onClick: () => this.removeForm(id),
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
	private removeReference(id: string, form: FormValues): FormValues {
		return Map(
			form.map(values =>
				List(
					values.map(value => {
						const props: Partial<FormValue> = {}
						if (value.reference === id) {
							props.reference = null
							if (value.value === Reference) {
								props.value = Inline
							}
						}
						props.inline = value.inline
							? this.removeReference(id, value.inline)
							: Map({})
						return value.with(props)
					})
				)
			)
		)
	}
	private removeForm(id: string) {
		const graph = this.state.graph.delete(id)
		const slice = this.state.forms.delete(id)
		const forms = slice.map(form => this.removeReference(id, form))
		this.setState({ forms: Map(forms), graph })
	}
	private createNode(type: string[]): string {
		const id = Underground.createId()
		const forms = this.state.forms.set(id, Map({}))
		const graph = this.state.graph.set(id, type)
		this.setState({ forms, graph })
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
		return { [ID]: `_:${id}`, [TYPE]: type, ...properties.toJS() }
	}

	private handleSubmit(event, publish?: boolean) {
		event.preventDefault()
		console.log("handling submit!")
		const nodes = this.state.forms.map(props => props.entrySeq()).entrySeq()
		const graph = nodes.map(this.exportNode).toJS()
		console.log("graph", graph)
		const assertion = { [CONTEXT]: {}, [GRAPH]: graph }
		this.setState({ forms: Map({}), graph: Map({}) })
		if (publish) {
			this.props.onSubmit(assertion)
		} else {
			this.props.onDownload(assertion)
		}
	}
}
