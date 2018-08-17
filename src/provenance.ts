import { AssertionGraph } from "./schema/types"
import { context, topic } from "./utils/constants"

const provContext = {
  "@context": {
    ...context,
    prov: "http://www.w3.org/ns/prov#",
  },
}

const url = {
  "@type": "URL",
  "@value": "https://github.com/underlay/playground-0",
}
const provAgent = {
  "@type": ["prov:SoftwareAgent", "SoftwareApplication"],
  name: {
    "@value": "Underlay Playground",
    "@type": "Text",
  },
  url,
}

export default function generateProv(id: string, graph: AssertionGraph) {
  const date = new Date()
  return {
    ...provContext,
    "@type": ["prov:Entity"],
    "@graph": graph,
    "prov:wasGeneratedBy": {
      "@type": "prov:Activity",
      "prov:wasAssociatedWith": provAgent,
    },
    "prov:generatedAtTime": { "@type": "Date", "@value": date.toISOString() },
    "prov:wasAttributedTo": {
      "@type": ["prov:Person"],
      identifier: {
        "@type": "PropertyValue",
        name: { "@type": "Text", "@value": "PeerID" },
        url: {
          "@type": "URL",
          "@value": "https://github.com/libp2p/js-peer-id",
        },
        value: { "@type": "Text", "@value": id },
      },
    },
  }
}

const s = {
  "@context": {
    xsd: "http://www.w3.org/2001/XMLSchema#",
    prov: "http://www.w3.org/ns/prov#",
    "@vocab": "http://schema.org/",
  },
  "@type": "prov:Entity",
  "prov:wasGeneratedBy": {
    "@type": "prov:Activity",
    "prov:wasAssociatedWith": {
      url: "https://github.com/underlay/playground-0",
      name: "Underlay Playground",
      "@type": ["prov:SoftwareAgent"],
    },
  },
  "prov:generatedAtTime": {
    "@type": "xsd:dateTime",
    "@value": "2018-08-15T15:16:44.311Z",
  },
  "prov:wasAttributedTo": {
    "@type": ["prov:Person", "Person"],
    identifier: {
      "@type": "PropertyValue",
      url: "https://github.com/libp2p/js-peer-id",
      name: "PeerID",
      value: "QmXRo2KYdjUmDLQMQJsXQ1xWkcTaMB7ZykzWkHK1mjFxPh",
    },
  },
}
