const context = {
	"@vocab": "http://www.w3.org/ns/prov#",
	schema: "http://schema.org/",
	value: { "@type": "@id" },
	wasAttributedTo: { "@type": "@id" },
	wasAssociatedWith: { "@type": "@id" },
}

export default function generateProv(id: string, name: string) {
	const date = new Date()
	return {
		"@context": context,
		"@graph": [
			{
				"@type": "Entity",
				value: name,
				wasGeneratedBy: {
					"@type": "Activity",
					wasAssociatedWith: ["_:software-agent", "_:person"],
				},
				generatedAtTime: date.toISOString(),
				wasAttributedTo: "_:person",
			},
			{
				"@type": "SoftwareAgent",
				"@id": "_:software-agent",
				"schema:name": "Underlay Playground",
				"schema:url": "https://github.com/underlay/playground-0",
			},
			{
				"@type": "Person",
				"@id": "_:person",
				"schema:identifier": {
					"@type": "schema:PropertyValue",
					"schema:name": "PeerID",
					"schema:url": "https://github.com/libp2p/js-peer-id",
					"schema:value": id,
				},
			},
		],
	}
}
