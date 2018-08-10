const context = {
	prov: "http://www.w3.org/ns/prov#",
	schema: "http://schema.org/",
}

export default function generateProv(id: string, hash: string) {
	const date = new Date()
	return {
		"@context": context,
		"@graph": [
			{
				"@type": "prov:Entity",
				"@id": "_:entity",
				"prov:value": { "@index": "/", "@value": hash },
				"prov:wasGeneratedBy": {
					"@type": "prov:Activity",
					"prov:wasAssociatedWith": [
						{ "@id": "_:software-agent" },
						{ "@id": "_:person" },
					],
				},
				"prov:generatedAtTime": date.toISOString(),
				"prov:wasAttributedTo": { "@id": "_:person" },
			},
			{
				"@type": "prov:SoftwareAgent",
				"@id": "_:software-agent",
				"prov:atLocation": "https://github.com/underlay/playground-0",
			},
			{
				"@type": "prov:Person",
				"@id": "_:person",
				"schema:identifier": id,
			},
		],
	}
}
