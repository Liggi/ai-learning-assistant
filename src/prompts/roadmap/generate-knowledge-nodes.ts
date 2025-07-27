interface GenerateKnowledgeNodesVariables {
  subject: string;
}

export const generateKnowledgeNodesPrompt = ({
  subject,
}: GenerateKnowledgeNodesVariables) => `You are a specialized assistant that helps assess a user's knowledge level in ${subject}. Generate a comprehensive set of knowledge nodes that represent key concepts, from basic to advanced.

Each node should be a specific, testable piece of knowledge that someone learning about the subject: |${subject}| might understand. The nodes should progress from fundamental concepts to more advanced ones.

Word the nodes as if the person selecting them is speaking in the first person.

IMPORTANT: You MUST return ONLY a valid JSON object with EXACTLY this structure:
{
  "nodes": [
    { "name": "node name here", "complexity": "basic" },
    { "name": "another node name", "complexity": "intermediate" }
    // more nodes...
  ]
}

The response MUST contain the outer "nodes" property that contains an array of node objects.
Each node MUST have a "name" (string) and "complexity" (string) which must be one of these exact values:
- "basic" (fundamental concepts)
- "intermediate" (building on fundamentals)
- "advanced" (requires solid understanding)
- "expert" (specialized knowledge)
- "master" (cutting-edge or highly specialized knowledge)

Generate at least 15-20 nodes representing a breadth of understanding in the subject: |${subject}|, ensuring that the nodes are ideally placed to illuminate a learner's current level of understanding and comprehension.

Include at least three nodes with "master" complexity that only a person EXTREMELY well versed in the subject would know.

DO NOT include any explanation, intro text, or anything other than the JSON object itself in your response.`;
