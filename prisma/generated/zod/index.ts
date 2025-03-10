import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['Serializable']);

export const SubjectScalarFieldEnumSchema = z.enum(['id','title','createdAt','updatedAt']);

export const CurriculumMapScalarFieldEnumSchema = z.enum(['id','subjectId','nodes','edges','createdAt','updatedAt']);

export const PersonalLearningMapScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt']);

export const MapContextScalarFieldEnumSchema = z.enum(['id','curriculumMapId','moduleId','personalLearningMapId','createdAt','updatedAt','subjectId']);

export const ArticleScalarFieldEnumSchema = z.enum(['id','content','personalLearningMapId','isRoot','createdAt','updatedAt']);

export const UserQuestionScalarFieldEnumSchema = z.enum(['id','text','personalLearningMapId','sourceArticleId','destinationArticleId','isImplicit','createdAt','updatedAt']);

export const ContextualTooltipScalarFieldEnumSchema = z.enum(['id','term','explanation','articleId','createdAt','updatedAt']);

export const LayoutScalarFieldEnumSchema = z.enum(['id','personalLearningMapId','nodes','edges','nodeHeights','createdAt','updatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);
/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// SUBJECT SCHEMA
/////////////////////////////////////////

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Subject = z.infer<typeof SubjectSchema>

/////////////////////////////////////////
// CURRICULUM MAP SCHEMA
/////////////////////////////////////////

export const CurriculumMapSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  nodes: JsonValueSchema,
  edges: JsonValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CurriculumMap = z.infer<typeof CurriculumMapSchema>

/////////////////////////////////////////
// PERSONAL LEARNING MAP SCHEMA
/////////////////////////////////////////

export const PersonalLearningMapSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PersonalLearningMap = z.infer<typeof PersonalLearningMapSchema>

/////////////////////////////////////////
// MAP CONTEXT SCHEMA
/////////////////////////////////////////

export const MapContextSchema = z.object({
  id: z.string().uuid(),
  curriculumMapId: z.string(),
  moduleId: z.string(),
  personalLearningMapId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  subjectId: z.string(),
})

export type MapContext = z.infer<typeof MapContextSchema>

/////////////////////////////////////////
// ARTICLE SCHEMA
/////////////////////////////////////////

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  personalLearningMapId: z.string(),
  isRoot: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Article = z.infer<typeof ArticleSchema>

/////////////////////////////////////////
// USER QUESTION SCHEMA
/////////////////////////////////////////

export const UserQuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  personalLearningMapId: z.string(),
  sourceArticleId: z.string(),
  destinationArticleId: z.string(),
  isImplicit: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserQuestion = z.infer<typeof UserQuestionSchema>

/////////////////////////////////////////
// CONTEXTUAL TOOLTIP SCHEMA
/////////////////////////////////////////

export const ContextualTooltipSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  explanation: z.string(),
  articleId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ContextualTooltip = z.infer<typeof ContextualTooltipSchema>

/////////////////////////////////////////
// LAYOUT SCHEMA
/////////////////////////////////////////

export const LayoutSchema = z.object({
  id: z.string().uuid(),
  personalLearningMapId: z.string(),
  nodes: JsonValueSchema,
  edges: JsonValueSchema,
  nodeHeights: JsonValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Layout = z.infer<typeof LayoutSchema>
