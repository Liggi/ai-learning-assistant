interface GenerateBadgesVariables {
  subject: string;
  nodes: string[];
  selectedKnowledgeNodes: string[];
}

export const generateBadgesPrompt = ({
  subject,
  nodes,
  selectedKnowledgeNodes,
}: GenerateBadgesVariables) => `You are a specialized assistant that creates achievement badges for learning platforms. I need you to generate a set of badges for a learning journey in ${subject}.

CRITICAL LEVEL DISTRIBUTION REQUIREMENTS:
- Bronze: 50% of badges (10-13 badges)
- Silver: 25% of badges (5-6 badges) 
- Gold: 20% of badges (4-5 badges)
- Platinum: 5% of badges (EXACTLY 1 badge)
- TOTAL BADGES: 20-25 badges

STRICT ENFORCEMENT:
1. Level distribution MUST match the percentages above
2. Platinum badges MUST be exceptionally rare (only 1)
3. Bronze should be the most common level
4. Gold badges should be reserved for complex integrations or conceptual breakthroughs

Here is the learning roadmap with MODULE IDs in parentheses:
${nodes.join("\n")}

The learner has indicated they already understand these concepts:
${selectedKnowledgeNodes.join("\n")}

Create a set of achievement badges that span this entire learning journey. Each badge must use the EXACT module ID shown in parentheses from the roadmap above. Badges should tell a cohesive story of mastery across the whole curriculum.

Return the badges in this precise JSON format:

{
  "badges": [
    {
      "name": "Badge Name",
      "description": "A description that explains both the achievement and the inside joke/reference",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "moduleId": "EXACT_MODULE_ID_FROM_ROADMAP" // Must match one of the IDs in parentheses above
    }
  ]
}

Guidelines for badge creation:
1. Create 20-25 badges total, distributed across the modules
2. Names should reference common experiences/struggles/revelations in learning this topic
3. Descriptions should acknowledge the shared experience while explaining what was mastered
4. LEVELS MUST FOLLOW THE DISTRIBUTION SHOWN ABOVE - THIS IS CRITICAL
5. Focus on authentic learning moments that practitioners would immediately recognize
6. Make badges build on each other to tell a story of growing mastery
7. Include some badges that require understanding concepts across multiple modules

Example badge (for React Hooks):
{
  "name": "Effect and Cause",
  "description": "Successfully navigated the counterintuitive world of useEffect's cleanup patterns - you've seen both sides of the effect.",
  "level": "Gold",
  "moduleId": "hooks-module" // Must match EXACT module ID from roadmap
}

Return ONLY valid JSON, no additional text or commentary.`;
