import React, { Fragment } from "react"
import { Map, List } from "immutable"
import niceware from "niceware"
import jsonld from "jsonld"
import {
  ID,
  TYPE,
  VALUE,
  SUBCLASS,
  thing,
  dagOptions,
  topic,
  pubsubOptions,
  context,
} from "./utils/constants"
import Assertion from "./assertion"
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
  ipfs: ipfs
  onSubmit: (assertion: AssertionGraph) => void
  onDownload: (assertion: AssertionGraph) => void
}

interface UndergroundState {
  hash: string
  assertions: List<[string, number, string, AssertionGraph]>
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
    const hash = window.location.hash.slice(1)
    this.state = {
      hash,
      assertions: List(),
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
      const hash = window.location.hash.slice(1)
      if (hash === "log" || hash === "new") {
        if (this.state.hash !== hash) this.setState({ hash })
      } else window.location.hash = this.state.hash
    })
    this.props.ipfs.pubsub.subscribe(
      topic,
      ({ from, data }: libp2p.Message) => {
        let result: AssertionGraph
        const text = data.toString("utf8")
        try {
          result = JSON.parse(text)
        } catch (err) {
          console.error(err)
        }
        const time = new Date().valueOf()
        this.importAssertion(from, time, result)
      },
      pubsubOptions
    )
  }
  readFile = event => {
    event.preventDefault()
    const { files } = event.target
    const time = new Date()
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        if (file.type === "application/json") {
          const reader = new FileReader()
          reader.onloadend = () => {
            let data
            const text = reader.result as string // Hmm
            try {
              data = JSON.parse(text)
            } catch (e) {
              console.error("Could not parse assertion", text, e)
            }
            this.importAssertion(
              "local file upload",
              time.valueOf(),
              data as AssertionGraph
            )
          }
          reader.readAsText(file)
        }
      })
    }
  }
  async importAssertion(from: string, time: number, assertion: AssertionGraph) {
    const cid = await this.props.ipfs.dag.put(assertion, dagOptions)
    const hash = cid.toBaseEncodedString()
    const assertions = this.state.assertions.push([from, time, hash, assertion])
    this.setState({ assertions })
    console.log("got the cid!", cid)
  }
  renderFileInput() {
    return (
      <input
        className="file-input"
        type="file"
        accept="application/json"
        onChange={this.readFile}
      />
    )
  }
  render() {
    const { hash } = this.state
    if (hash === "new") return this.renderForm()
    else if (hash === "log") return this.renderLog()
    else window.location.hash = "new"
  }
  renderLog() {
    const { assertions } = this.state
    const content = assertions.size
      ? assertions
          .map(([id, time, hash, assertion], key) => ({
            id,
            time,
            hash,
            assertion,
            key,
          }))
          .map(props => <Assertion {...props} />)
      : "No assertions found"
    return (
      <div className="log">
        <header>
          <a href="#new">create new assertion</a>
        </header>
        <hr />
        {content}
      </div>
    )
  }
  renderForm() {
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
        >
          {this.renderFileInput()}
          <a href="#log">assertion log</a>
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
        node[ID] = `_:${reference}` || null
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
    jsonld.compact(graph, context, (err, compacted) => {
      this.setState({ forms: Map({}), graph: Map({}) })
      if (err) console.error(err)
      else if (publish) this.props.onSubmit(compacted)
      else this.props.onDownload(compacted)
    })
  }
}
