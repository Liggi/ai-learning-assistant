# Learning Orchestrator Implementation

This document outlines the implementation of the Learning Orchestrator, which is part of Phase 6 of our domain model migration plan.

## Overview

The Learning Orchestrator is a central coordination layer that manages the interactions between all domain-specific services in our application. It replaces the previous Conversation Orchestrator and aligns with our new domain model that distinguishes between curriculum design (CurriculumMap) and individual learning experiences (PersonalLearningMap).

## Responsibilities

The Learning Orchestrator has the following key responsibilities:

1. **Initialization**: Setting up a PersonalLearningMap for a specific module in a CurriculumMap
2. **Content Generation**: Coordinating the creation of Articles and their associated ContextualTooltips
3. **Question Management**: Handling user questions and suggested questions
4. **Visualization**: Coordinating the visual representation of the PersonalLearningMap
5. **State Management**: Tracking the state of the learning session
6. **Error Handling**: Providing centralized error handling for all operations

## Architecture

The Learning Orchestrator follows a hook-based architecture that:

1. Initializes and coordinates all domain services
2. Manages the lifecycle of a learning session
3. Handles user interactions and state transitions
4. Coordinates between curriculum and personal maps
5. Manages article generation and connection

## Implementation Details

### Service Initialization

The orchestrator initializes all required domain services:

```typescript
const curriculumMap = useCurriculumMapService(subjectId);
const personalLearningMap = usePersonalLearningMapService();
const article = useArticleService();
const userQuestion = useUserQuestionService(null);
const tooltip = useContextualTooltipService(null);
const visualization = usePersonalLearningMapVisualizationService(...);
```

### Learning Session Lifecycle

The orchestrator manages the complete lifecycle of a learning session:

1. **Initialization**: Creates or loads a PersonalLearningMap for a specific module
2. **Root Article Creation**: Generates the initial article content for the module
3. **Tooltip Processing**: Extracts and explains technical terms from the article
4. **Question Generation**: Creates suggested questions based on article content
5. **Visualization**: Updates the visual representation of the learning map

### User Interactions

The orchestrator handles various user interactions:

1. **Question Handling**: Processes user questions and generates article responses
2. **Term Exploration**: Allows users to learn more about specific terms
3. **Node Selection**: Manages selection and navigation between articles
4. **Session Refresh**: Provides functionality to reset and restart a learning session

### Error Handling and Deduplication

The orchestrator implements robust error handling and request deduplication:

1. **Centralized Error State**: Maintains a single error state for all operations
2. **Request Deduplication**: Prevents duplicate processing of identical questions
3. **Retry Logic**: Implements cooldown and retry mechanisms for failed operations
4. **Graceful Degradation**: Handles partial failures without breaking the entire session

## Usage

The Learning Orchestrator is used in the application as follows:

```typescript
const {
  // Services
  curriculumMap,
  personalLearningMap,
  article,
  userQuestion,
  tooltip,
  visualization,

  // Orchestration state
  isInitializing,
  error,
  orchestrationState,

  // Event handlers
  handleSuggestedQuestionClick,
  handleUserQuestion,
  handleLearnMoreAboutTerm,
  handleRefresh,
  handleNodeClick,
} = useLearningOrchestrator(
  subjectId,
  moduleId,
  moduleTitle,
  moduleDescription
);
```

## Differences from Conversation Orchestrator

The Learning Orchestrator differs from the previous Conversation Orchestrator in several key ways:

1. **Domain Model Alignment**: Uses the new domain entities (PersonalLearningMap, Article, UserQuestion, etc.)
2. **Structured Learning**: Focuses on a structured learning experience rather than a conversation
3. **Visual Navigation**: Emphasizes the visual map representation for navigation
4. **Contextual Understanding**: Provides deeper context through tooltips and related articles
5. **Module Association**: Maintains a clear association with curriculum modules

## Future Enhancements

Potential future enhancements to the Learning Orchestrator include:

1. **Progress Tracking**: Adding functionality to track learning progress through modules
2. **Cross-Module Navigation**: Supporting navigation between related modules
3. **Learning Path Recommendations**: Suggesting optimal learning paths based on user behavior
4. **Collaborative Learning**: Supporting shared learning maps between multiple users
5. **Offline Support**: Adding functionality for offline learning sessions
