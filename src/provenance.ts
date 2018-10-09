import { AssertionGraph } from "./schema/types"
import { context } from "./utils/constants"
import { sign } from "./signatures"

const provContext = {
	"@context": {
		...context,
		prov: "http://www.w3.org/ns/prov#",
	},
}

const provAgent = {
	"@type": ["prov:SoftwareAgent", "SoftwareApplication"],
	name: {
		"@value": "Underlay Playground",
		"@type": "Text",
	},
	url: {
		"@type": "URL",
		"@value": "https://github.com/underlay/playground-0",
	},
}

export default async function generateProv(
	id: string,
	{ "@graph": graph }: AssertionGraph,
	ipfs: ipfs
) {
	const date = new Date()
	const doc = {
		...provContext,
		"@type": ["prov:Entity"],
		"@graph": graph,
		"prov:wasGeneratedBy": {
			"@type": "prov:Activity",
			"prov:wasAssociatedWith": [provAgent, { "@id": `dweb:/ipns/${id}` }],
		},
		"prov:generatedAtTime": { "@type": "Date", "@value": date.toISOString() },
		"prov:wasAttributedTo": {
			"@id": `dweb:/ipns/${id}`,
			"@type": ["prov:Agent"],
		},
	}
	return sign(doc, ipfs)
}
