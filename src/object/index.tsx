import React from "react"

import LinkObject from "./link"
import GraphObject from "./graph"
import NodeObject from "./node"

export interface ObjectComponent {
  test: (node: {}) => boolean
  component: React.ClassType<ObjectProps, any, any>
}

export interface ObjectProps {
  ipfs: ipfs
  node: {}
}

const components = [LinkObject, GraphObject, NodeObject]

export default function(props: ObjectProps) {
  const component = components.find(({ test }) => test(props.node))
  return React.createElement(component.component, props)
}
