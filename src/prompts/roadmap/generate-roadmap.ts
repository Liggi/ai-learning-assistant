interface GenerateRoadmapVariables {
  subject: string;
  priorKnowledge: string;
}

export const generateRoadmapPrompt = ({
  subject,
  priorKnowledge,
}: GenerateRoadmapVariables) => `You are a specialized assistant that can create structured data in JSON. I want you to generate a list of thoughtful learning steps in the form of an array of "nodes," and an array of "edges" connecting them.

The user wants to learn about ${subject} and has provided their current understanding:
"""
${priorKnowledge}
"""

Using the Feynman Technique principles, analyze their explanation to identify knowledge gaps and misconceptions. Then create a personalized learning roadmap that:
1. Builds upon their existing knowledge
2. Addresses any gaps or misconceptions identified
3. Introduces new concepts in a logical progression
4. Includes practical exercises and examples

Please precisely follow this format:

1. Return a JSON object with two keys: "nodes" and "edges".
2. "nodes" should be an array of objects. Each node should have:
   • an "id" as a string,
   • a "position" property with x and y coordinates (e.g. { x: 200, y: 400 }),
   • a "type" property set to "normalNode",
   • a "data" object that has:
     - "label" describing the step name
     - "description" providing a brief explanation
     - "status" set to "not-started" (other possible values are "in-progress" and "completed")
3. Ensure that the nodes are spaced with at least 200 units between them vertically, and 300-400 units horizontally. Start the first node at x: 400, y: 0.

4. "edges" should be an array of objects. Each edge should have:
   • "id" in the format "eSOURCEID-TARGETID"
   • a "source" property matching a node's id
   • a "target" property matching a node's id
   • a "type" property set to "smoothstep"

Please ensure your generated roadmap contains expertly crafted learning steps, connecting them logically from basic principles to more advanced ideas. Your output must strictly be valid JSON in the specified shape, with no extra commentary included.
Ensure the roadmap has multiple branching paths, not just one single linear path unless that is the only way to sensibly cover the topics.

For example, follow the structure:
{
  "nodes": [
    {
      "id": "1",
      "position": { "x": 400, "y": 0 },
      "type": "normalNode",
      "data": {
        "label": "Sample Step",
        "description": "This is a short description of the step",
        "status": "not-started"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "type": "smoothstep"
    }
  ]
}

Make sure the nodes and edges reflect a learning roadmap from fundamentals to more advanced steps.

IMPORTANT: For the node positions, ensure that each node is at least 400 "units" in both directions from any other node.`;
