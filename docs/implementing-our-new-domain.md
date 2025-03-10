# Implementing Our New Domain Model

This document outlines an implementation plan for our new domain model, focusing on the transition from our current architecture to the target architecture. The plan is designed to be incremental, allowing us to maintain functionality throughout the transition.

## Implementation Overview

We will be migrating from our current conversation-based model to a more structured approach that distinguishes between curriculum design (CurriculumMap) and individual learning experiences (PersonalLearningMap). This implementation will involve:

1. Creating new database models
2. Implementing type definitions and serialization functions
3. Developing server functions for data access
4. Building API hooks for client-side data fetching
5. Creating service layer for business logic
6. Implementing orchestration layer for coordinating services
7. Updating UI components to work with the new domain model

## File Structure Organization

To maintain a clean and maintainable codebase, we're organizing our files to match our domain model. Each core domain entity should have its own dedicated file for server functions, following these principles:

1. **One Domain Entity Per File**: Each core domain entity (Subject, CurriculumMap, PersonalLearningMap, Article, UserQuestion, ContextualTooltip) should have its own dedicated file for server functions.

2. **Naming Convention**: Files should be named after the domain entity they represent, using kebab-case for multi-word entities (e.g., `curriculum-maps.ts`, `personal-learning-maps.ts`).

3. **File Contents**: Each file should contain:

   - Type definitions specific to that entity
   - Serialization functions for that entity
   - Server functions for CRUD operations on that entity
   - Any helper functions specific to that entity

4. **Import Structure**:
   - Files should import shared types from generated schemas
   - Entity files can import serialization functions from other entity files when needed
   - API hooks should import from the appropriate entity files

### Example: Articles Separation

We've applied this pattern by separating article-related functions from `personal-learning-maps.ts` into a dedicated `articles.ts` file:

1. Created `articles.ts` with:

   - Article-specific type definitions
   - `serializeArticle` function
   - CRUD server functions for articles (`createArticle`, `getArticle`, etc.)

2. Updated `personal-learning-maps.ts` to:

   - Import `serializeArticle` from `./articles`
   - Remove article-specific server functions
   - Maintain references to article types for relationship handling

3. Updated API hooks in `hooks/api/articles.ts` to:
   - Import from the new `@/prisma/articles` file instead of `@/prisma/personal-learning-maps`

This separation provides several benefits:

- Clearer responsibility boundaries
- Smaller, more focused files
- Easier navigation and maintenance
- Better alignment with our domain model

As we continue implementing the remaining domain entities, we'll follow this same pattern to ensure our file structure reflects our domain model.

## Current vs. Target Architecture

### Current Architecture

Our current system is based on:

- **Subject**: Contains a Roadmap with nodes representing modules
- **Roadmap**: Visual representation of modules and their connections within a subject
- **Conversation**: A collection of messages between user and AI
- **Message**: Text content with metadata, where AI-generated messages serve as lessons
- **Layout**: Visual representation of the conversation

Inside the chat experience, we have these services:

- **Lesson Service**: Manages the generation and display of lesson content
- **Tooltip Service**: Extracts and manages tooltips from lesson content
- **Question Service**: Generates suggested questions based on lesson content
- **Conversation Service**: Manages the conversation state and history
- **Visualization Service**: Handles the visual representation of the conversation

### Target Architecture

Our target architecture distinguishes between curriculum design and personal learning:

- **Subject**: Top-level educational topic
- **CurriculumMap**: Structured representation of a subject's curriculum with modules and pathways (renamed from Roadmap)
- **PersonalLearningMap**: Individual user's exploration journey
- **Article**: Discrete unit of educational content (replacing AI-generated messages)
- **UserQuestion**: Connections between articles based on user inquiries
- **ContextualTooltip**: Article-specific explanations for technical terms
- **MapContext**: Association between a PersonalLearningMap and a specific module in a CurriculumMap

## Implementation Plan

### Phase 1: Database Schema Changes ✅ COMPLETED

#### Step 1: Define New Schema Models ✅ COMPLETED

We've successfully implemented the following changes to our database schema:

1. Renamed Roadmap to CurriculumMap while preserving its core structure
2. Created new models for PersonalLearningMap, Article, UserQuestion, ContextualTooltip, and MapContext
3. Established appropriate relations between all models with proper cascade deletion behavior

Key accomplishments:

- Maintained semantic and self-documenting field names
- Implemented proper cascade deletion for all relationships
- Used JSON fields for flexible data structures like node positions
- Added clear inline documentation for each model
- Successfully regenerated the database with the new schema
- Generated updated Prisma client for application use

These changes form the foundation for our transition from the conversation-based model to our new domain-focused architecture that distinguishes between curriculum design and personal learning experiences.

### Phase 2: Type Definitions and Serialization ✅ COMPLETED

#### Step 1: Define Core Types ✅ COMPLETED

We've successfully implemented the following type definitions:

1. Created TypeScript interfaces and Zod schemas for CurriculumMap (replacing Roadmap)
2. Defined types for PersonalLearningMap, Article, UserQuestion, ContextualTooltip, and MapContext
3. Implemented serialized versions of all entities for client-side use
4. Created appropriate index signatures and nested type definitions

#### Step 2: Implement Serialization Functions ✅ COMPLETED

We've successfully implemented the following serialization functions:

1. Created functions to convert Prisma model instances to serialized types (serializeCurriculumMap, serializePersonalLearningMap, etc.)
2. Implemented proper handling of nested relations
3. Added conversion of Date objects to ISO strings for client-side use
4. Ensured proper type safety throughout the serialization process
5. Created helper functions for JSON field handling
6. Removed outdated files (roadmap.ts and conversations.ts)

These changes ensure proper data transfer between our database and client-side code with full type safety and consistent serialization patterns.

### Phase 3: Server Functions Implementation ✅ COMPLETED

#### Step 1: Subject and CurriculumMap Functions ✅ COMPLETED

We've successfully implemented the following changes:

1. Updated the existing Subject functions to use the new terminology
2. Renamed `getSubjectWithRoadmap` to `getSubjectWithCurriculumMap`
3. Created a `curriculum-maps.ts` file with `saveCurriculumMap` function to replace `saveRoadmap`
4. Removed all backward compatibility functions to complete the migration
5. Updated all relevant imports and function calls throughout the codebase

#### Step 2: API Hooks Layer Updates ✅ COMPLETED

We've successfully migrated the API hooks layer:

1. Updated `useSubjectWithRoadmap` to `useSubjectWithCurriculumMap`
2. Changed `useSaveRoadmap` to `useSaveCurriculumMap`
3. Updated all related imports and query keys
4. Updated server function calls within the hooks

#### Step 3: Features and Components ✅ COMPLETED

We've successfully updated the feature generators and components:

1. Created a new `curriculum-map.ts` generator replacing the roadmap generator
2. Created a new `CurriculumMapView` component replacing `RoadmapView`
3. Updated imports and references in route components
4. Updated loading states and context terminology
5. Removed all deprecated files and references

These completed changes form a solid foundation for the continued implementation of the remaining aspects of our new domain model.

### Note on Remaining Roadmap References

Despite the completed phases above, several references to "roadmap" still exist in the codebase and should be addressed during the remaining implementation phases:

1. **Prompt Files**:

   - Files in `/prompts/roadmap/` directory still use "roadmap" terminology
   - Examples: `generate-roadmap.ts`, `generate-knowledge-nodes.ts`
   - Consider renaming these to align with "curriculum-map" terminology

2. **Feature Generators**:

   - Some generator functions still import from `/prompts/roadmap/`
   - Examples: `curriculum-map.ts` still imports `generateRoadmapPrompt`
   - Update these imports and function calls for consistency

3. **Utility Functions and Types**:

   - Some helper functions and interface names still use roadmap terminology
   - Example: `RoadmapNode` interface in badges generator
   - These should be renamed to maintain consistency across the codebase

4. **UI Components**:

   - Some UI components contain references to "roadmap" in comments or state variables
   - Example: `existing-knowledge-calibration.tsx` has several roadmap references
   - These should be updated as part of the UI component updates in Phase 7

5. **Migration Files**:
   - Historical migration files will retain "roadmap" references
   - These don't need to be changed, but should be noted for context

When addressing these remaining references, ensure that updates are made systematically to maintain consistency across the application while preserving functionality.

#### Step 4: PersonalLearningMap Functions ✅ COMPLETED

We've successfully implemented the following server functions for PersonalLearningMap:

1. `createPersonalLearningMap` - Creates a new personal learning map associated with a module in a curriculum map
2. `getPersonalLearningMap` - Gets a personal learning map by ID with all related data
3. `getPersonalLearningMapsByModule` - Gets personal learning maps by curriculum map ID and module ID
4. `updatePersonalLearningMap` - Updates a personal learning map's metadata
5. `updateMapContext` - Updates a map context, changing the association with a curriculum map module
6. `deletePersonalLearningMap` - Deletes a personal learning map and all related data

We've also created API hooks for these server functions:

1. `usePersonalLearningMap` - Hook to fetch a personal learning map by ID
2. `usePersonalLearningMapsByModule` - Hook to fetch personal learning maps by curriculum map module
3. `useCreatePersonalLearningMap` - Hook to create a new personal learning map
4. `useUpdatePersonalLearningMap` - Hook to update a personal learning map
5. `useUpdateMapContext` - Hook to update a map context
6. `useDeletePersonalLearningMap` - Hook to delete a personal learning map

#### Step 5: Article Functions ✅ COMPLETED

We've successfully implemented the following server functions for Article:

1. `createArticle` - Creates a new article in a personal learning map
2. `getArticle` - Retrieves an article by ID
3. `getArticlesByPersonalLearningMap` - Gets all articles for a personal learning map
4. `updateArticle` - Updates an article's content
5. `deleteArticle` - Deletes an article
6. `getRootArticle` - Gets the root article for a personal learning map

These functions provide the foundation for managing articles within personal learning maps, supporting the create-then-update pattern for streaming content generation.

#### Step 6: UserQuestion Functions ✅ COMPLETED

We've successfully implemented the following server functions for UserQuestion:

1. `createUserQuestion` - Creates a new user question connecting two articles
2. `getUserQuestion` - Gets a user question by ID
3. `getUserQuestionsByPersonalLearningMap` - Gets all user questions for a personal learning map
4. `getUserQuestionsBySourceArticle` - Gets user questions by source article ID
5. `getUserQuestionsByDestinationArticle` - Gets user questions by destination article ID
6. `updateUserQuestion` - Updates a user question's text
7. `deleteUserQuestion` - Deletes a user question

We've also created API hooks for these server functions:

1. `useUserQuestion` - Hook to fetch a user question by ID
2. `useUserQuestionsByPersonalLearningMap` - Hook to fetch user questions by personal learning map
3. `useUserQuestionsBySourceArticle` - Hook to fetch user questions by source article
4. `useUserQuestionsByDestinationArticle` - Hook to fetch user questions by destination article
5. `useCreateUserQuestion` - Hook to create a new user question
6. `useUpdateUserQuestion` - Hook to update a user question
7. `useDeleteUserQuestion` - Hook to delete a user question

These functions provide the foundation for managing connections between articles in personal learning maps, supporting both explicit user questions and implicit connections (e.g., from exploring tooltips).

#### Step 7: ContextualTooltip Functions ✅ COMPLETED

We've successfully implemented the following server functions for ContextualTooltip:

1. `createTooltip` - Creates a single tooltip for an article
2. `createTooltipBatch` - Creates multiple tooltips at once for an article
3. `getTooltip` - Retrieves a tooltip by ID
4. `getArticleTooltips` - Gets all tooltips for an article
5. `updateTooltip` - Updates a tooltip's term or explanation
6. `deleteTooltip` - Deletes a tooltip
7. `deleteArticleTooltips` - Deletes all tooltips for an article

We've also created API hooks for these server functions:

1. `useTooltip` - Hook to fetch a tooltip by ID
2. `useArticleTooltips` - Hook to fetch all tooltips for an article
3. `useCreateTooltip` - Hook to create a single tooltip
4. `useCreateTooltipBatch` - Hook to create multiple tooltips at once
5. `useUpdateTooltip` - Hook to update a tooltip
6. `useDeleteTooltip` - Hook to delete a tooltip
7. `useDeleteArticleTooltips` - Hook to delete all tooltips for an article

These functions provide the foundation for managing contextual tooltips within articles, supporting both individual tooltip creation and batch processing for performance optimization.

#### Step 8: Layout Functions ✅ COMPLETED

We've successfully implemented the following server functions for Layout:

1. `createLayout` - Creates a new layout for a personal learning map
2. `getLayoutByPersonalLearningMapId` - Gets a layout by personal learning map ID
3. `updateLayout` - Updates an existing layout
4. `upsertLayout` - Creates or updates a layout (upsert operation)
5. `deleteLayout` - Deletes a layout

We've also created API hooks for these server functions:

1. `useLayoutByPersonalLearningMap` - Hook to fetch a layout by personal learning map ID
2. `useCreateLayout` - Hook to create a new layout
3. `useUpdateLayout` - Hook to update an existing layout
4. `useUpsertLayout` - Hook to upsert a layout (create or update)
5. `useDeleteLayout` - Hook to delete a layout

These functions provide the foundation for managing the visual representation of personal learning maps, supporting the storage and retrieval of node positions, edge properties, and node heights for proper layout rendering.

### Phase 4: API Hooks Layer ✅ COMPLETED

We've successfully implemented API hooks for all of our domain entities:

#### Step 1: Query Hooks ✅ COMPLETED

- Created query hooks for Subjects and CurriculumMaps
- Implemented hooks for PersonalLearningMaps with filtering by module
- Added hooks for Articles with various retrieval patterns
- Created hooks for UserQuestions with filtering by source/destination
- Implemented hooks for ContextualTooltips with article-based filtering
- Organized all hooks in domain-specific files (e.g., `hooks/api/articles.ts`)
- Ensured proper loading, error, and success state handling

#### Step 2: Mutation Hooks ✅ COMPLETED

- Implemented creation hooks for all entities
- Added update hooks with proper validation
- Created deletion hooks with cascade handling
- Implemented proper cache invalidation strategies
- Added optimistic updates where appropriate

### Phase 5: Service Layer Implementation

#### Service Layer Patterns and Approaches

In implementing the service layer, we've established the following patterns and principles:

1. **Service Responsibility**: Each service is responsible for one domain entity and its associated operations.

   - Services manage domain-specific business logic and state
   - State management is handled with React hooks (useState, useRef, etc.)
   - Operations are implemented as callbacks with useCallback
   - Services interact with API hooks for data persistence

2. **Standardized Service Structure**:

   - **State Variables**: Local state for UI control (loading states, selected items, errors)
   - **API Hooks**: React Query hooks for data fetching and mutations
   - **Derived State**: useMemo for computed values from state and data
   - **Operations**: Business logic functions implementing domain operations
   - **Return Object**: Consolidated state and operations in a single returned object

3. **Error Handling Pattern**:

   - Centralized error state in each service
   - Try/catch blocks around all async operations
   - Standardized error transformation with instanceof checks
   - Error logging using the Logger utility

4. **Logging Pattern**:

   - Context-specific logger instance for each service
   - Structured logging with object metadata
   - Different log levels for different information types
   - Request tracing through operation lifecycle

5. **Migration Approach**:
   - Rename existing functionality while preserving behavior
   - Maintain compatibility with existing UI components
   - Update imports to use new domain entity files
   - Follow consistent naming patterns across entities

These patterns ensure a consistent and maintainable service layer that properly encapsulates domain logic while providing a clean interface for UI components.

#### Step 1: CurriculumMap Service ✅ COMPLETED

We've successfully implemented the CurriculumMap Service:

- Created `hooks/services/curriculum-map-service.ts` with the following features:

  - State management for map generation and selection
  - Integration with the Subject and CurriculumMap API hooks
  - Map generation functionality using the curriculum map generator
  - Map saving functionality for persisting changes
  - Node selection and retrieval operations
  - Proper error handling and logging
  - Consistent return type with state and operations

- Created `hooks/services/index.ts` to export all services, including both:
  - Legacy services that will eventually be replaced
  - New domain model services (currently CurriculumMapService)

This implementation maintains all the functionality of the previous roadmap-related code but applies our new domain terminology consistently.

#### Step 2: PersonalLearningMap Service (replacing Conversation Service) ✅ COMPLETED

We've successfully implemented the PersonalLearningMap Service:

- Created `hooks/services/personal-learning-map-service.ts` with the following features:

  - State management for personal learning map initialization and selection
  - Integration with PersonalLearningMap, Article, and UserQuestion API hooks
  - Map initialization with curriculum module association
  - Root article creation functionality
  - Article creation from user questions (both explicit and implicit)
  - Map context updating for changing module associations
  - Article selection and retrieval operations
  - Navigation helpers for traversing the article graph (parent/child relationships)
  - Question relationship management (source/destination connections)
  - Proper error handling and logging
  - Consistent return type with state and operations

- Updated `hooks/services/index.ts` to export the new service

This implementation replaces the previous Conversation Service but focuses on managing the map of articles and questions rather than messages. It provides a clean interface for UI components to interact with personal learning maps and maintains the same patterns as other services while adapting to the new domain model.

#### Step 3: Article Service (replacing Lesson Service) ✅ COMPLETED

We've successfully implemented the Article Service:

- Created `hooks/services/article-service.ts` with the following features:

  - State management for article content and generation
  - Integration with the Article API hooks
  - Content generation using the existing lesson generator
  - Streaming support for progressive UI updates
  - Request deduplication to prevent duplicate API calls
  - Article creation and update functionality
  - Content listener registration for cross-service communication
  - Proper error handling and logging
  - Consistent return type with state and operations

- Updated `hooks/services/index.ts` to export the new service

This implementation replaces the previous Lesson Service but focuses on articles instead of messages. It maintains the same patterns and structure as other services while adapting to the new domain model. The service provides a clean interface for UI components to interact with articles and supports both immediate and streaming content generation.

#### Step 4: UserQuestion Service ✅ COMPLETED

We've successfully implemented the UserQuestion Service:

- Created `hooks/services/user-question-service.ts` with the following features:

  - State management for both suggested questions and user questions
  - Integration with the UserQuestion API hooks
  - Suggested question generation based on article content
  - User question creation, update, and deletion functionality
  - Support for both explicit questions (user-initiated) and implicit questions (e.g., from exploring tooltips)
  - Clear separation between ephemeral suggested questions and persisted user questions
  - Proper error handling and logging
  - Consistent return type with state and operations

- Updated `hooks/services/index.ts` to export the new service

This implementation evolves from the previous Question Service but focuses on both suggested and user-initiated questions. It maintains the same patterns as other services while adapting to the new domain model. The service provides a clean interface for UI components to interact with questions and supports the connection of articles through user inquiries.

#### Step 5: ContextualTooltip Service ✅ COMPLETED

We've successfully implemented the ContextualTooltip Service:

- Created `hooks/services/contextual-tooltip-service.ts` with the following features:

  - State management for tooltip generation and retrieval
  - Integration with the ContextualTooltip API hooks
  - Term extraction from article content
  - Batch processing for performance optimization
  - Local storage caching for frequently used tooltips
  - Progress tracking during generation
  - Proper error handling and logging
  - Consistent return type with state and operations

- Updated `hooks/services/index.ts` to export the new service

This implementation provides the foundation for managing contextual tooltips within articles, supporting both individual tooltip creation and batch processing for performance optimization. The service follows the same patterns as other services while adapting to the new domain model.

#### Step 6: Visualization Service ✅ COMPLETED

We've successfully implemented the Visualization Service:

- Created `hooks/services/visualization-service.ts` with the following features:

  - State management for personal learning map visualization
  - Integration with the Layout API hooks
  - Tree-based layout algorithm for positioning articles and questions
  - Node content generation for article summaries and takeaways
  - Layout persistence with database storage
  - Node height tracking for proper spacing
  - Zoom and navigation functionality
  - Proper error handling and logging
  - Consistent return type with state and operations

- Updated `hooks/services/index.ts` to export the new service as `usePersonalLearningMapVisualizationService`

This implementation replaces the previous Visualization Service but focuses on the personal learning map instead of conversations. It maintains the same patterns as other services while adapting to the new domain model. The service provides a clean interface for UI components to interact with the visual representation of personal learning maps, supporting both the display of articles and the connections between them through user questions.

### Phase 6: Orchestration Layer ✅ COMPLETED

#### Step 1: Learning Orchestrator (replacing Conversation Orchestrator) ✅ COMPLETED

We've successfully implemented the Learning Orchestrator to replace the previous Conversation Orchestrator:

- Created `hooks/orchestration/learning-orchestrator.ts` with the following features:

  - Initialization and coordination of all domain-specific services
  - Management of the learning session lifecycle
  - Handling of user interactions and state transitions
  - Coordination between curriculum and personal maps
  - Management of article generation and connection
  - Proper error handling and request deduplication
  - Consistent interface for UI components

- Created `hooks/orchestration/index.ts` to export both:

  - The new Learning Orchestrator for new components
  - The legacy Conversation Orchestrator for backward compatibility

- Created `docs/orchestration-layer.md` to document:
  - The responsibilities of the Learning Orchestrator
  - The architecture and implementation details
  - The differences from the previous Conversation Orchestrator
  - Usage patterns and future enhancement possibilities

This implementation completes the orchestration layer of our new domain model, providing a cohesive coordination mechanism for all the domain services we've implemented in previous phases.

### Phase 7: UI Updates ✅ IN PROGRESS

#### Step 1: ChatLayout Component Update ✅ COMPLETED

We've successfully implemented a new `LearningLayout` component to replace the previous `ChatLayout`:

- Created `learning-layout.tsx` that uses the new domain terminology
- Updated state extraction to use the new service names
- Created proper type conversion for tooltip objects
- Used safe handling for userQuestion service state
- Maintained consistent UI structure and appearance
- Created a temporary placeholder for the learning map visualization

#### Step 2: PersonalLearningMapFlow Component ✅ COMPLETED

We've successfully implemented a full-featured visualization component:

- Created `personal-learning-map-flow.tsx` using XY Flow to render the learning map
- Integrated with `ReactFlow` to handle the visualization rendering
- Implemented proper node and edge handling with custom node types
- Created responsive design with proper styling
- Added event handling for node selection

#### Step 3: Custom Node Components ✅ COMPLETED

We've developed specialized components for our domain entities:

- Created `article-node.tsx` to render article content with summaries and key takeaways
- Implemented `question-node.tsx` to display user questions with proper styling
- Added support for both explicit questions and implicit explorations
- Implemented responsive resizing with height tracking
- Used consistent styling with the application theme

#### Step 4: New Route Implementation ✅ COMPLETED

We've set up a new route to use our updated components:

- Created `/learning/$subjectId.$moduleId.tsx` route file
- Maintained the same loader logic for retrieving module details
- Updated component to use LearningLayout instead of ChatLayout
- Preserved all existing functionality with new naming

#### Step 5: Integration with Visualization Service ✅ COMPLETED

We've integrated the UI components with the visualization service:

- Connected the PersonalLearningMapFlow to the visualization data from the orchestrator
- Ensured proper data flow from the visualization service to the React Flow components
- Implemented proper event handling for node selection
- Added appropriate error handling and loading states

### Phase 8: Integration and Functionality Verification ✅ IN PROGRESS

Phase 8 focuses on ensuring proper integration between services and verifying the end-to-end functionality of our new domain model. We've made significant progress in the following areas:

#### Step 1: Cross-Service Integration ✅ IN PROGRESS

We've established connections between our domain services to ensure they work together cohesively:

- Connected the visualization service to the UI through the learning orchestrator
- Established data flow between the article service and the visualization service
- Set up event handling for user interactions that span multiple services
- Implemented proper state management for cross-service operations

#### Next Steps

The following steps are still to be completed:

1. Verify Generator Integration

   - Ensure all services are properly integrated with their respective generators
   - Confirm that the tooltip generator works correctly with the new domain model
   - Verify question generation for both suggested and user-initiated questions

2. Complete Missing Functionality

   - Add proper streaming support for Article content generation
   - Implement retry logic for API calls
   - Add proper error handling for all edge cases

3. Performance Optimization
   - Implement caching strategies for expensive operations
   - Add batching for related operations
   - Optimize API calls to minimize latency
