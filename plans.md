# Enhancement Plan: Dynamic Topic Seeds, Article Types, and Suggested Questions

This document outlines a concrete plan to implement the requested features while preserving existing flows, React Flow behavior, and the current design language.

Assumptions:
- Default article type is `deep_dive` for backward compatibility.
- Question category is persisted and influences UI and the next article’s prompt.
- Topic seeds are suggestions; persistence occurs only upon subject creation.

---

## 1) Dynamic LLM-Powered Topic Seeds

Goal: Render clickable, refreshable suggestion pills under the subject input in [subject-entry.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/subject-selection/subject-entry.tsx).

Backend
- New server function: `src/features/generators/topic-seeds.ts`
  - Pattern like [features/generators/suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/generators/suggested-questions.ts)
  - Zod schema: `{ seeds: string[] }`
  - Prompt file: `src/prompts/chat/topic-seeds.ts` (small, diverse seeds; supports optional `subjectDraft` hint)
  - Use existing `robustLLMCall` and Anthropic client pattern

Frontend
- Hook: `src/hooks/use-topic-seeds.ts`
  - Generate seeds on mount; expose `refresh()`; accepts optional subject draft
- UI: Update [subject-entry.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/subject-selection/subject-entry.tsx)
  - Render 4–6 pill buttons below input; clicking sets `onSubjectChange(seed)`
  - Add a subtle “Refresh” icon button on the right
  - Use shadcn Button/Badge styles that match dark theme

Example prompt (topic-seeds.ts)
```ts
export const createPrompt = ({ subjectDraft }: { subjectDraft?: string }) => `
Generate 5 short, distinct, engaging learning topic seeds${subjectDraft ? ` related to "${subjectDraft}"` : ''}.
- Mix exploration depth: beginner-friendly, practical, conceptual, historical, adjacent fields
- Keep under 5 words each when possible
Return JSON only: {"seeds": ["...", "...", "..."]}
`;
```

---

## 2) Enhanced Article Types System

Goal: Add `article.type` (begin with `deep_dive`) to drive generation prompts and optional UI labels, keeping current behavior by default.

Database
- Update [schema.prisma](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/prisma/schema.prisma):
  - Add `enum ArticleType { DEEP_DIVE /* future: CONCEPTUAL_OVERVIEW, CHALLENGE_EXERCISE */ }`
  - Add `type ArticleType @default(DEEP_DIVE)` to `Article`
- Create migration to add enum + column with default

Types & Serialization
- Update [serialized.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serialized.ts) `SerializedArticle` with `type: string`
- Ensure pass-through in [serializers.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serializers.ts)

Backend API
- [prisma/articles.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prisma/articles.ts)
  - `createArticle`: accept optional `type`; persist
  - `createArticleFromQuestion`: accept optional `articleType`; set on child article

Prompts
- [prompts/chat/lesson.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/lesson.ts):
  - Add `articleType?: "deep_dive" | ...` param
  - Branch prompt sections by type (deep_dive retains current instructions)
- [routes/api/lesson-stream.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/routes/api/lesson-stream.ts):
  - Accept and pass `articleType` to the prompt builder

UI
- Optional type badge in [components/article-content.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/article-content.tsx)
- Optional micro-label in map nodes ([learning-map/article-node.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/learning-map/article-node.tsx))

---

## 3) Enhanced Suggested Questions System

Goal: Questions carry a category (Go Deeper, Detour, Challenge). UI visually distinguishes categories. Category is mapped to an article type for the generated child article.

Database
- Update [schema.prisma](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/prisma/schema.prisma):
  - Add `enum QuestionCategory { GO_DEEPER DETOUR CHALLENGE }`
  - Add `category QuestionCategory @default(GO_DEEPER)` to `Question`
- Create migration with defaults

Types & Serialization
- Extend [serialized.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serialized.ts) `SerializedQuestion` with `category: string`
- Include in [serializers.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serializers.ts)

Backend Generators
- Update [prompts/chat/suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/suggested-questions.ts) to structured output:
  - `{ "suggestions": [{ "text": string, "category": "go_deeper" | "detour" | "challenge", "articleType"?: string }] }`
- Update [features/generators/suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/generators/suggested-questions.ts) Zod schema and parsing

Article Creation Flow
- [createArticleFromQuestion](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prisma/articles.ts):
  - Accept `questionCategory` and optional `articleType`
  - Persist `Question.category` and `Article.type`
  - Default mapping:
    - GO_DEEPER → `deep_dive`
    - DETOUR → `conceptual_overview` (future)
    - CHALLENGE → `challenge_exercise` (future)

Streaming Influence
- [hooks/use-stream-article-content.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/hooks/use-stream-article-content.ts):
  - Include `articleType` and `questionCategory` in body when available
- [routes/api/lesson-stream.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/routes/api/lesson-stream.ts):
  - Validate and pass these to [prompts/chat/lesson.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/lesson.ts)

UI
- Hook: Update [hooks/use-suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/hooks/use-suggested-questions.ts) to return structured items
- Component: Update [components/suggested-questions.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/suggested-questions.tsx)
  - Pill style varies by category (border/edge color accent; dark-theme friendly)
  - Pass `{ questionText, questionCategory, articleType }` to mutation
- Optional: Add tiny category chips on question nodes in the map

Prompt sketch (suggested-questions)
```ts
export const createPrompt = ({ subject, currentMessage }: { subject: string; currentMessage: string }) => `
Subject: ${subject}
Last article:
"""
${currentMessage}
"""
Propose 4 follow-up questions. For each include a category:
- go_deeper: drill into a subtopic introduced
- detour: explore an adjacent concept
- challenge: test or apply understanding
Optionally recommend articleType:
- go_deeper => deep_dive
- detour => conceptual_overview
- challenge => challenge_exercise
Return JSON only:
{"suggestions":[{"text":"...","category":"go_deeper","articleType":"deep_dive"}, ...]}
`;
```

---

## 4) UI Design Integration

- Maintain dark theme (slate-900/950 backgrounds, slate-700/800 borders) and spacing from existing components like [components/learning-interface.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/learning-interface.tsx).
- Use shadcn components: [ui/button.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/ui/button.tsx), [ui/badge.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/ui/badge.tsx), [ui/skeleton.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/ui/skeleton.tsx)
- Keep animations consistent (framer-motion already in [subject-entry.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/subject-selection/subject-entry.tsx))

---

## Cross-Cutting Tasks Checklist

Prisma & Migrations
- [ ] Update [prisma/schema.prisma](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/prisma/schema.prisma): add `ArticleType`, `QuestionCategory`, `Article.type`, `Question.category`
- [ ] Generate migration + run
- [ ] Verify [prisma/generated/zod/index.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/prisma/generated/zod/index.ts) includes new enums/fields

Types & Serializers
- [ ] Update [src/types/serialized.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serialized.ts)
- [ ] Update [src/types/serializers.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serializers.ts)

Backend
- [ ] Add `src/features/generators/topic-seeds.ts`
- [ ] Add `src/prompts/chat/topic-seeds.ts`
- [ ] Update `src/prompts/chat/suggested-questions.ts` to structured output
- [ ] Update `src/features/generators/suggested-questions.ts` to parse structured output
- [ ] Update `src/prisma/articles.ts` create paths to accept/store `type`, `questionCategory`

Streaming
- [ ] Update [src/hooks/use-stream-article-content.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/hooks/use-stream-article-content.ts) to pass `articleType` and `questionCategory`
- [ ] Update [src/routes/api/lesson-stream.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/routes/api/lesson-stream.ts) to accept and forward to the prompt
- [ ] Update [src/prompts/chat/lesson.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/lesson.ts) to branch on `articleType`

Frontend
- [ ] New hook `src/hooks/use-topic-seeds.ts`
- [ ] Update [src/features/subject-selection/subject-entry.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/subject-selection/subject-entry.tsx) to show seeds UI
- [ ] Update [src/hooks/use-suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/hooks/use-suggested-questions.ts) to structured items
- [ ] Update [src/components/suggested-questions.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/suggested-questions.tsx) to categorize UI and pass category/type
- [ ] Optional badges in [src/components/article-content.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/components/article-content.tsx) and map nodes

---

## Testing Plan

Unit
- Prompts: validate builders in [prompts/chat/lesson.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/lesson.ts), [prompts/chat/suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/suggested-questions.ts), and `prompts/chat/topic-seeds.ts` produce expected schemas
- Serializers: ensure `type` and `category` propagate via [serializers.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/types/serializers.ts)

Integration
- Suggested questions: click each category → child article has correct `article.type` and category persisted
- Streaming: non-root articles include `articleType`/`questionCategory` and generate content via correct prompt branch
- Subject entry: seeds render, autofill input, refresh works responsively

Migration/Backcompat
- Existing articles → `type = DEEP_DIVE`
- Existing questions → `category = GO_DEEPER`
- UI falls back gracefully if fields missing during rollout

---

## Rollout Steps
1) DB
- Add enums/columns, run migrations, regenerate Prisma & Zod

2) Backend
- Implement topic seeds generator and prompt
- Update suggested-questions to structured output
- Extend articles service for `type` and `category`

3) Prompts
- Add `topic-seeds.ts`
- Update [lesson.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/lesson.ts) and [suggested-questions.ts](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/prompts/chat/suggested-questions.ts)

4) Frontend
- Add `use-topic-seeds`, update SubjectEntry
- Update suggested questions hook/component
- Optional badges/labels

5) QA
- Run `pnpm dev` and walk through subject entry → map creation → suggested questions branching
- Run tests `pnpm test` and add coverage for prompt builders and serializers

---

## Future Extensions (non-blocking)
- Additional article types: `conceptual_overview`, `quick_reference`, `historical_context`, `challenge_exercise`
- Personalization of topic seeds based on user history or `recent-subjects` ([features/subject-selection/recent-subjects.tsx](file:///Users/jasonliggi/src/github.com/personal/learning-assistant-app/src/features/subject-selection/recent-subjects.tsx))
- Tracking question-to-outcome metrics to refine category/type mappings
