# Domain Modelling for Learning Assistant App

## Core Entities

### LearningMap

The central entity that represents a user's exploration through knowledge spaces. A LearningMap:

- Starts with an origin article and branches out based on the user's questions
- Provides a visual graph of the knowledge space they've explored
- Persists across sessions, allowing users to continue their learning journey
- Typically associated with a subject/module, but designed with flexibility for future extensions

### Article

A discrete unit of educational content that:

- Contains AI-generated explanations about a specific topic
- Includes highlighted terms with associated contextual tooltips
- Can be connected to other articles through questions
- May include metadata like difficulty level, prerequisites, or subject domain

### UserQuestion

Represents both:

- A user's actual inquiry that leads from one article to another
- The connection or edge between articles in the learning map
- Created when a user explicitly asks a question or selects a suggested question
- Can also be created implicitly when a user explores a term
- Becomes a permanent part of the LearningMap structure

### SuggestedQuestion

Represents potential paths of exploration:

- Generated automatically based on article content
- Presented to the user as possible next steps
- Selecting one creates a new UserQuestion
- Completely ephemeral - not stored in the database
- Regenerated on demand when viewing an article

### ContextualTooltip

Context-specific explanations for terms within an article:

- Provides article-specific explanation of a highlighted term
- Belongs to exactly one article (not shared across articles)
- Dynamically generated based on the article's specific context
- Can serve as a potential starting point for a new article if explored further

## Relationships

- A **LearningMap** contains multiple **Articles** and **UserQuestions**
- Each **UserQuestion** connects exactly two **Articles** (source and destination)
- The initial **Article** is the origin node of the **LearningMap**
- **Articles** contain their own set of **ContextualTooltips**
- **SuggestedQuestions** are ephemeral and generated on demand for an **Article**
- Selecting a **SuggestedQuestion** creates a new **UserQuestion**
- Exploring a **ContextualTooltip** creates a new **Article** and an implicit **UserQuestion**
- A **LearningMap** is typically associated with a subject/module but not strictly bound to it

## User Interactions

- Users navigate the **LearningMap** by selecting either **SuggestedQuestions** or asking their own questions
- When a user selects a **SuggestedQuestion**, a new **UserQuestion** is created and triggers generation of a new **Article**
- Custom questions asked by users also become **UserQuestions** and generate new **Articles**
- Users can revisit previously generated **Articles** through the map visualization
- Hovering over highlighted terms reveals their **ContextualTooltips**
- Users can request to "Tell me more about this term", creating an implicit **UserQuestion** and generating a new **Article** connected to the original

## System Processes

- **Article** generation happens on-demand
- **ContextualTooltip** extraction and explanation occurs during article generation
- **SuggestedQuestions** are generated on demand when viewing an **Article**
- **SuggestedQuestions** are not persisted and are regenerated as needed
- Each **Article** has its own set of contextually appropriate tooltips
- The **LearningMap** visualization updates as new articles are added through **UserQuestions**

This domain model focuses on the core exploration and mapping metaphor while maintaining flexibility for future extensions, such as cross-subject exploration.
