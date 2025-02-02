interface GenerateKnowledgeNodesVariables {
  subject: string;
}

export const generateKnowledgeNodesPrompt = ({
  subject,
}: GenerateKnowledgeNodesVariables) => `You are a specialized assistant that helps assess a user's knowledge level in ${subject}. Generate a comprehensive set of knowledge nodes that represent key concepts, from basic to advanced.

Each node should be a specific, testable piece of knowledge that someone learning about the subject: |${subject}| might understand. The nodes should progress from fundamental concepts to more advanced ones

Word the nodes as if the person selecting them is speaking in the first person.'.

Return a JSON object in the following format:

For example:
{ "nodes": [
 { name: "<node name>", depth_level: "<depth level (1-5)>"}
]
}

Generate at least 15-20 nodes representing a breadth of understanding in the subject: |${subject}|, ensuring that the nodes are ideally placed to illuminate a learner's current level of understanding and comprehension.

Include at least three nodes that only a person EXTREMELY well versed in the subject would know.`;
