# Badge Generation - Initial Implementation

## Overview

The badge system serves two distinct purposes, which suggests they might be better implemented as separate entities:

### 1. Learning Path Badges

- **Purpose**: Structure the learning pathway through individual modules
- **Usage**: The AI assistant uses these to guide the conversation flow
- **Characteristics**:
  - More granular, focused on specific concepts
  - Tied directly to learning objectives
  - Used to ensure comprehensive coverage of module content
  - Help structure the conversation naturally

### 2. Achievement Badges

- **Purpose**: Reward and track overall learning journey progress
- **Usage**: Motivate and recognize significant milestones
- **Characteristics**:
  - More celebration-focused
  - Mark major accomplishments
  - Cross-module achievements
  - Public/shareable accomplishments

## AI Assistant Integration

The AI will use badges (particularly Learning Path Badges) to:

1. Guide conversation flow subtly towards uncovered topics
2. Generate contextual follow-up questions
3. Ensure comprehensive topic coverage
4. Track learning progress

Example conversation flow:

```typescript
interface LearningPathBadge {
  id: string;
  concept: string;
  suggestedQuestions: string[];
  prerequisites: string[]; // Other badge IDs
  verificationCriteria: string; // How to verify understanding
}

// Example of how AI might use badges to guide conversation
const conversationFlow = {
  currentBadge: {
    id: "js-async-basics",
    concept: "Asynchronous Basics",
    suggestedQuestions: [
      "What happens when we need to wait for data?",
      "How does JavaScript handle long-running tasks?",
    ],
    prerequisites: ["js-functions"],
    verificationCriteria:
      "Can explain callback concept and identify async operations",
  },
  nextBadges: [
    {
      id: "js-promises",
      concept: "Promises",
      suggestedQuestions: [
        "How can we make async code more manageable?",
        "What problems do Promises solve?",
      ],
    },
  ],
};
```

## Implementation Focus

### 1. Prompt Testing

We'll focus on generating two types of badges with distinct characteristics:

#### Learning Path Badges

- More numerous and granular
- Include suggested questions and prerequisites
- Focus on concept coverage and understanding
- Used primarily by the AI for conversation guidance

#### Achievement Badges

- Follow the original level distribution (Bronze/Silver/Gold/Platinum)
- Focus on significant milestones
- More celebration-oriented
- Public-facing achievements

### 2. Test Cases

```typescript
// Test Case: Learning Path Badges
const learningPathTest = {
  subject: "JavaScript",
  module: {
    id: "js-async",
    label: "Asynchronous JavaScript",
    description: "Understanding async programming patterns",
    concepts: ["Callbacks", "Promises", "Async/Await", "Event Loop"],
  },
};

// Test Case: Achievement Badges
const achievementTest = {
  subject: "JavaScript",
  completedModules: ["js-basics", "js-functions"],
  currentModule: "js-async",
  overallProgress: 0.4, // 40% through the curriculum
};
```

## Next Steps

1. Split badge generation into two separate prompts
2. Test and refine AI conversation guidance using Learning Path Badges
3. Ensure Achievement Badges maintain motivation and celebration aspects
4. Test conversation flows with different badge combinations

## Prompt Design

### Learning Path Badge Generation

```typescript
interface LearningPathPromptInput {
  subject: string;
  module: {
    id: string;
    label: string;
    description: string;
    concepts: string[];
    prerequisites?: string[]; // Other module IDs that should be completed first
  };
}
```

Prompt template:

```text
You are a specialized AI focused on creating learning pathways. Given a module in ${subject}, create a sequence of learning badges that will guide a student through mastering the content.

Module: ${module.label}
Description: ${module.description}
Key Concepts: ${module.concepts.join(", ")}

For each concept, create a learning badge that includes:
1. A clear concept identifier
2. 2-3 probing questions that would verify understanding
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
      "verificationCriteria": "string"
    }
  ]
}
```

### Achievement Badge Generation

```typescript
interface AchievementPromptInput {
  subject: string;
  moduleProgress: {
    completed: string[]; // Module IDs
    current: string; // Current module ID
    overall: number; // Progress percentage
  };
  currentModule: {
    label: string;
    description: string;
  };
}
```

Prompt template:

```text
You are a specialized assistant that creates achievement badges for learning platforms. Create a set of badges for a student's progress in ${subject}.

Current Progress:
- Completed Modules: ${moduleProgress.completed.join(", ")}
- Current Module: ${currentModule.label}
- Overall Progress: ${moduleProgress.overall * 100}%

CRITICAL LEVEL DISTRIBUTION:
- Bronze: 50% (10-13 badges)
- Silver: 25% (5-6 badges)
- Gold: 20% (4-5 badges)
- Platinum: 5% (EXACTLY 1 badge)
TOTAL: 20-25 badges

Create badges that:
1. Recognize both module completion and cross-module achievements
2. Celebrate key learning milestones
3. Include clever references to ${subject} concepts
4. Build up to the Platinum badge as a major achievement

Return in this JSON format:
{
  "achievementBadges": [
    {
      "name": "string",
      "description": "string",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "moduleId": "string" | null,  // null for cross-module achievements
      "requirements": ["string"]
    }
  ]
}
```

## Generation Strategy

1. **Learning Path Badges**

   - Generate at module start
   - One badge per key concept
   - Include bridging badges for complex transitions
   - Store with module metadata for AI reference

2. **Achievement Badges**
   - Generate initial set at learning journey start
   - Update available badges as modules are completed
   - Reveal badges progressively based on prerequisites
   - Cache and update only when new modules are completed

## Success Criteria

### Learning Path Badges

- [ ] Effectively guide conversation flow
- [ ] Cover all necessary concepts
- [ ] Include relevant suggested questions
- [ ] Clear prerequisites and verification criteria

### Achievement Badges

- [ ] Creative and motivating names
- [ ] Meaningful milestones
- [ ] Proper difficulty distribution
- [ ] Cross-module coherence
