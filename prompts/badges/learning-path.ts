interface GenerateCurriculumLearningPathVariables {
  subject: string;
  subjectArea: string;
  nodes: string[];
}

interface GenerateModuleLearningPathVariables {
  moduleId: string;
  moduleLabel: string;
  moduleDescription: string;
  concepts: string[];
}

export const generateCurriculumLearningPathPrompt = ({
  subject,
  subjectArea,
  nodes,
}: GenerateCurriculumLearningPathVariables) => `You are a specialized AI focused on creating learning pathways. Given a curriculum in ${subject} (${subjectArea}), create a sequence of high-level learning badges that will guide a student through mastering the entire subject area.

Curriculum Overview:
${nodes.join("\n")}

For each major concept that spans multiple modules, create a learning badge that includes:
1. A clear concept identifier
2. 2-3 probing questions that verify understanding
3. Prerequisites (other concepts that should be understood first)
4. Specific criteria to verify mastery

The badges should:
- Focus on high-level concepts that span multiple modules
- Build on each other logically
- Cover foundational to advanced concepts
- Include questions that probe both understanding and application

Return the badges in this JSON format:
{
  "learningPathBadges": [
    {
      "id": "string (subject-area-concept)",
      "concept": "string",
      "suggestedQuestions": ["string"],
      "prerequisites": ["string"],
      "verificationCriteria": "string",
      "subjectArea": "${subjectArea}"
    }
  ]
}`;

export const generateModuleLearningPathPrompt = ({
  moduleId,
  moduleLabel,
  moduleDescription,
  concepts,
}: GenerateModuleLearningPathVariables) => `You are a specialized AI focused on creating learning pathways. Given a module in ${moduleLabel}, create a sequence of learning badges that will guide a student through mastering the content.

Module Description: ${moduleDescription}
Key Concepts: ${concepts.join(", ")}

For each concept, create a learning badge that includes:
1. A clear concept identifier
2. 2-3 probing questions that verify understanding
3. Prerequisites (other concepts that should be understood first)
4. Specific criteria to verify mastery

The badges should:
- Build on each other logically
- Cover all key concepts
- Include questions that probe both understanding and application
- Have clear, measurable verification criteria

Return the badges in this JSON format:
{
  "learningPathBadges": [
    {
      "id": "string (module-id-concept)",
      "concept": "string",
      "suggestedQuestions": ["string"],
      "prerequisites": ["string"],
      "verificationCriteria": "string",
      "moduleId": "${moduleId}"
    }
  ]
}`;
