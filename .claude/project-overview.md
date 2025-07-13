# Learning Assistant App - Project Overview

## Purpose

The Learning Assistant App is an AI-powered personalized learning platform that creates adaptive learning maps for any subject. The application leverages large language models (Anthropic Claude and OpenAI) to generate contextual educational content, create visual learning pathways, and provide an interactive learning experience tailored to each user's existing knowledge.

## Core Functionality

### 1. Subject-Based Learning
- Users input a subject they want to learn
- The system creates a personalized learning journey based on their existing knowledge
- Supports any subject domain through AI-generated content

### 2. Knowledge Calibration
- Initial assessment of user's familiarity with key concepts (`/calibration/$subjectId`)
- Captures what users already know to personalize the learning path
- Stored as `initiallyFamiliarConcepts` in the Subject model

### 3. Interactive Learning Maps
- Visual representation of learning content using React Flow
- Hierarchical structure with articles connected by questions
- Root articles serve as starting points for learning topics
- Users can navigate between related concepts through interactive nodes

### 4. AI-Generated Content
- **Articles**: Detailed explanations of concepts with summaries and takeaways
- **Questions**: Connecting questions that link related concepts
- **Tooltips**: Contextual explanations for complex terms within articles
- **Suggested Questions**: AI-generated follow-up questions to explore topics deeper

### 5. Streaming Content Generation
- Real-time content generation and display
- Progressive loading of educational material
- Responsive interface that updates as content becomes available

## Technical Architecture

### Frontend Stack
- **Framework**: React 19 with TanStack Router for routing
- **Visualization**: React Flow (@xyflow/react) for interactive learning maps
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for client-side state, TanStack Query for server state
- **UI Components**: Radix UI primitives with custom shadcn/ui components

### Backend Stack
- **Runtime**: Node.js with TanStack Start (full-stack React framework)
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: 
  - Anthropic Claude SDK for content generation
  - OpenAI API for image generation
- **Type Safety**: TypeScript throughout with Zod for runtime validation

### Data Model
- **Subject**: Learning topics with user's familiar concepts
- **LearningMap**: Container for all content related to a subject
- **Article**: Individual learning content pieces with metadata
- **Question**: Connections between articles that represent learning pathways

### Key Features
- **Layout Engine**: ELK (Eclipse Layout Kernel) for automatic graph layouting
- **Content Streaming**: Real-time content generation with progressive display
- **Contextual Tooltips**: AI-generated explanations for complex terms
- **Responsive Design**: Mobile-friendly interface with collapsible learning maps

## User Journey

1. **Subject Selection** (`/`): User enters a topic they want to learn
2. **Knowledge Calibration** (`/calibration/$subjectId`): System assesses existing knowledge
3. **Learning Interface** (`/learning/$subjectId`): Interactive learning map with content
4. **Article Exploration** (`/learning/article/$articleId`): Deep dive into specific concepts
5. **Question-Driven Navigation**: Users explore related concepts through AI-generated questions

## Development Workflow

### Testing
- Vitest for unit testing with React Testing Library
- Component testing for UI interactions
- API testing for server functions

### Build & Development
- Vite-based build system through Vinxi
- Hot module replacement for rapid development
- TypeScript compilation with strict type checking

### Database Management
- Prisma migrations for schema evolution
- Zod integration for type-safe database operations
- Clear database scripts for development reset

## AI Integration Strategy

The application uses a multi-model approach:
- **Content Generation**: Anthropic Claude for educational content, explanations, and questions
- **Image Generation**: OpenAI DALL-E for visual learning aids
- **Prompt Engineering**: Sophisticated prompts for consistent, high-quality educational content
- **Streaming Responses**: Real-time content delivery for better user experience

## Unique Value Proposition

1. **Personalized Learning Paths**: AI adapts content based on user's existing knowledge
2. **Visual Learning Maps**: Interactive visualization of concept relationships
3. **Question-Driven Exploration**: Natural learning progression through curiosity-driven questions
4. **Contextual Understanding**: Tooltips and explanations maintain learning flow
5. **Unlimited Subject Coverage**: AI can generate content for any learning domain

This application represents a modern approach to personalized education, combining the power of large language models with intuitive user experience design to create adaptive learning experiences at scale.