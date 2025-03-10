# Domain Modelling for Learning Assistant App

## Core Entities

### Subject

The top-level educational topic that:

- Represents a broad area of knowledge (e.g., "JavaScript", "Machine Learning")
- Contains a CurriculumMap that outlines the learning structure
- Serves as the entry point for users to begin their learning journey
- Has metadata like title, description, and difficulty level

### CurriculumMap

The structured representation of a subject's curriculum that:

- Defines the intended learning path for a subject
- Contains nodes (modules) and edges (pathways between modules)
- Provides a visual overview of the entire subject domain
- Is typically created once per subject by educators or AI
- Serves as a reference for generating PersonalLearningMaps

### PersonalLearningMap

The central entity that represents a user's exploration through knowledge spaces. A PersonalLearningMap:

- Starts with an origin article and branches out based on the user's questions
- Provides a visual graph of the knowledge space they've explored
- Persists across sessions, allowing users to continue their learning journey
- Is typically associated with a specific node in a CurriculumMap
- Designed with flexibility for future extensions

### Article

A discrete unit of educational content that:

- Contains AI-generated explanations about a specific topic
- Includes highlighted terms with associated contextual tooltips
- Can be connected to other articles through questions
- May include metadata like difficulty level, prerequisites, or subject domain
- Belongs to a PersonalLearningMap

### UserQuestion

Represents both:

- A user's actual inquiry that leads from one article to another
- The connection or edge between articles in the personal learning map
- Created when a user explicitly asks a question or selects a suggested question
- Can also be created implicitly when a user explores a term
- Becomes a permanent part of the PersonalLearningMap structure

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

### MapContext

Flexible association between a PersonalLearningMap and its context:

- Links a PersonalLearningMap to a specific node in a CurriculumMap
- Stores metadata about the relationship (e.g., which subject and concept it relates to)
- Allows for tracking progress through the curriculum
- Enables multiple PersonalLearningMaps for the same curriculum node

## Relationships

- A **Subject** has exactly one **CurriculumMap**
- A **CurriculumMap** contains multiple nodes (modules) and edges (pathways between modules)
- A **PersonalLearningMap** is associated with a specific node in a **CurriculumMap** via a **MapContext**
- A **PersonalLearningMap** contains multiple **Articles** and **UserQuestions**
- Each **UserQuestion** connects exactly two **Articles** (source and destination)
- The initial **Article** is the origin node of the **PersonalLearningMap**
- **Articles** contain their own set of **ContextualTooltips**
- **SuggestedQuestions** are ephemeral and generated on demand for an **Article**
- Selecting a **SuggestedQuestion** creates a new **UserQuestion**
- Exploring a **ContextualTooltip** creates a new **Article** and an implicit **UserQuestion**

## User Interactions

- Users first select a **Subject** and view its **CurriculumMap**
- Users can select a specific concept (node) in the **CurriculumMap** to begin learning
- This creates or retrieves a **PersonalLearningMap** for that concept
- Users navigate their **PersonalLearningMap** by selecting either **SuggestedQuestions** or asking their own questions
- When a user selects a **SuggestedQuestion**, a new **UserQuestion** is created and triggers generation of a new **Article**
- Custom questions asked by users also become **UserQuestions** and generate new **Articles**
- Users can revisit previously generated **Articles** through the map visualization
- Hovering over highlighted terms reveals their **ContextualTooltips**
- Users can request to "Tell me more about this term", creating an implicit **UserQuestion** and generating a new **Article** connected to the original
- Users can return to the **CurriculumMap** to select different concepts to explore

## System Processes

- **CurriculumMap** generation happens when a new **Subject** is created
- **PersonalLearningMap** creation occurs when a user selects a concept from the **CurriculumMap**
- **Article** generation happens on-demand within a **PersonalLearningMap**
- **ContextualTooltip** extraction and explanation occurs during article generation
- **SuggestedQuestions** are generated on demand when viewing an **Article**
- **SuggestedQuestions** are not persisted and are regenerated as needed
- Each **Article** has its own set of contextually appropriate tooltips
- The **PersonalLearningMap** visualization updates as new articles are added through **UserQuestions**
- Progress through the **CurriculumMap** can be tracked based on which concepts have associated **PersonalLearningMaps**

This domain model distinguishes between the curriculum-level structure (**CurriculumMap**) and the individual user's exploration journey (**PersonalLearningMap**), while maintaining flexibility for future extensions, such as cross-subject exploration.
