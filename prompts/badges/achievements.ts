interface GenerateCurriculumAchievementsVariables {
  subject: string;
  subjectArea: string;
  nodes: string[];
  completedModules: string[];
  overallProgress: number;
}

interface GenerateModuleAchievementsVariables {
  subject: string;
  moduleId: string;
  moduleLabel: string;
  moduleDescription: string;
  concepts: string[];
  progress: number;
}

export const generateCurriculumAchievementsPrompt = ({
  subject,
  subjectArea,
  nodes,
  completedModules,
  overallProgress,
}: GenerateCurriculumAchievementsVariables) => `You are a specialized assistant that creates achievement badges for learning platforms. Create a set of curriculum-wide achievement badges for a student's progress in ${subject} (${subjectArea}).

Current Progress:
- Completed Modules: ${completedModules.length} out of ${nodes.length}
- Overall Progress: ${Math.round(overallProgress * 100)}%

Curriculum Overview:
${nodes.join("\n")}

CRITICAL LEVEL DISTRIBUTION:
- Bronze: 50% (5-6 badges)
- Silver: 25% (2-3 badges)
- Gold: 20% (2 badges)
- Platinum: 5% (EXACTLY 1 badge)
TOTAL: 10-12 curriculum-wide badges

Create badges that:
1. Recognize achievements that span multiple modules
2. Celebrate major learning milestones
3. Include clever references to ${subject} concepts
4. Build up to the Platinum badge as a major achievement

Return in this JSON format:
{
  "achievementBadges": [
    {
      "name": "string",
      "description": "string",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "requirements": ["string"],
      "subjectArea": "${subjectArea}"
    }
  ]
}`;

export const generateModuleAchievementsPrompt = ({
  subject,
  moduleId,
  moduleLabel,
  moduleDescription,
  concepts,
  progress,
}: GenerateModuleAchievementsVariables) => `You are a specialized assistant that creates achievement badges for learning platforms. Create a set of module-specific achievement badges for progress in the ${moduleLabel} module of ${subject}.

Module Description: ${moduleDescription}
Key Concepts: ${concepts.join(", ")}
Current Progress: ${Math.round(progress * 100)}%

CRITICAL LEVEL DISTRIBUTION:
- Bronze: 50% (4-5 badges)
- Silver: 25% (2-3 badges)
- Gold: 20% (1-2 badges)
- Platinum: 5% (EXACTLY 1 badge)
TOTAL: 8-11 module-specific badges

Create badges that:
1. Recognize mastery of specific module concepts
2. Celebrate key learning milestones
3. Include clever references to module-specific concepts
4. Build up to the Platinum badge as major module achievement

Return in this JSON format:
{
  "achievementBadges": [
    {
      "name": "string",
      "description": "string",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "requirements": ["string"],
      "moduleId": "${moduleId}"
    }
  ]
}`;
