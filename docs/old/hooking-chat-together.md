# Plan for Hooking Up Chat Functionality with Real User Input

## Current State

Currently, the chat layout component (`components/chat-layout.tsx`) is using hardcoded parameters for the lesson:

```typescript
// Default lesson parameters
const DEFAULT_LESSON_PARAMS = {
  subject: "Programming",
  moduleTitle: "Introduction to React",
  moduleDescription:
    "Learn the basics of React and how to build interactive UIs",
  message: "Explain the core concepts of React to a beginner developer",
};
```

These parameters are passed to the `useStreamingLesson` hook, which then makes an API call to generate the lesson content.

## Goal

The goal is to modify the chat layout to use real user input from the selected subject and module instead of hardcoded parameters. The chat screen is accessed after a user clicks on a module in the learning map, so we need to capture the subject ID and module ID from the URL parameters and use them to fetch the appropriate data.

## Implementation Plan (Revised with TanStack Start Loader Pattern)

### 1. Leverage TanStack Start's Loader Pattern for SSR Benefits

Update the chat route file to use TanStack Start's loader pattern for fetching module details:

```typescript
// app/routes/chat/$subjectId.$moduleId.tsx
import ChatLayout from "@/components/chat-layout";
import { createFileRoute } from "@tanstack/react-router";
import { getSubjectWithRoadmap } from "@/prisma/subjects";
import { ErrorDisplay } from "@/components/error-display";

export const Route = createFileRoute("/chat/$subjectId/$moduleId")({
  loader: async ({ params }) => {
    const { subjectId, moduleId } = params;
    const subject = await getSubjectWithRoadmap({ data: { id: subjectId } });

    if (!subject) {
      throw new Error(`Subject with ID ${subjectId} not found`);
    }

    // Find the module node in the roadmap
    const moduleNode = subject?.roadmap?.nodes.find(node => node.id === moduleId);

    if (!moduleNode) {
      throw new Error(`Module with ID ${moduleId} not found in subject ${subject.title}`);
    }

    // Ensure all required data is present
    if (!moduleNode.data?.label) {
      throw new Error(`Module ${moduleId} is missing required data (label)`);
    }

    return {
      moduleDetails: {
        subject: subject.title,
        moduleTitle: moduleNode.data.label,
        moduleDescription: moduleNode.data.description || "",
        message: `Explain ${moduleNode.data.label} to a beginner developer`,
      },
      subjectId,
      moduleId
    };
  },
  component: Chat,
  errorComponent: ({ error }) => {
    return <ErrorDisplay
      title="Error Loading Module"
      message={error.message || "Failed to load the requested module. Please try again or select a different module."}
    />;
  }
});

function Chat() {
  const { moduleDetails, subjectId, moduleId } = Route.useLoaderData();
  return <ChatLayout moduleDetails={moduleDetails} subjectId={subjectId} moduleId={moduleId} />;
}
```

### 2. Create an Error Display Component

Create a new component for displaying errors:

```typescript
// components/error-display.tsx
import React from "react";
import { Link } from "@tanstack/react-router";

interface ErrorDisplayProps {
  title: string;
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{title}</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        <Link
          to="/learning-map"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Learning Map
        </Link>
      </div>
    </div>
  );
};
```

### 3. Modify the ChatLayout Component to Accept Module Details

Update the `components/chat-layout.tsx` component to accept the module details as props:

```typescript
interface ChatLayoutProps {
  moduleDetails: {
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
    message: string;
  };
  subjectId: string;
  moduleId: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  moduleDetails,
  subjectId,
  moduleId,
}) => {
  const { content, isLoading, error, refreshLesson, isStreamingComplete } =
    useStreamingLesson(moduleDetails);

  const { tooltips, isGeneratingTooltips, tooltipsReady, resetTooltips } =
    useTooltipGeneration({
      content,
      isStreamingComplete,
      subject: moduleDetails.subject,
      moduleTitle: moduleDetails.moduleTitle,
      moduleDescription: moduleDetails.moduleDescription,
    });

  // Handle API errors during streaming
  if (error) {
    return (
      <ErrorDisplay
        title="Error Loading Lesson"
        message="There was a problem loading the lesson content. Please try refreshing the page."
      />
    );
  }

  // Handle refreshing - coordinate both hooks
  const handleRefresh = () => {
    resetTooltips();
    refreshLesson();
  };

  // Component rendering code...
};
```

### 4. Remove Default Parameters

Remove the hardcoded default parameters from the chat layout component since we'll now be showing error pages instead of falling back:

```typescript
// components/chat-layout.tsx
// Remove this:
// const DEFAULT_LESSON_PARAMS = {
//   subject: "Programming",
//   moduleTitle: "Introduction to React",
//   moduleDescription:
//     "Learn the basics of React and how to build interactive UIs",
//   message: "Explain the core concepts of React to a beginner developer",
// };
```

### 5. Ensure Roadmap Nodes Have Required Data

Make sure the roadmap nodes in the database have the necessary data fields (label, description) for generating lessons. Update the roadmap editor if needed to capture this information.

## Benefits of This Approach

1. **Server-Side Rendering (SSR)**: By using TanStack Start's loader pattern, the module details are fetched on the server before the component renders, improving initial load performance.

2. **Isomorphic Loaders**: The loader function runs on both the server and client, reducing code duplication and making the application more efficient.

3. **Automatic Data Hydration**: TanStack Start automatically handles the dehydration of data on the server and rehydration on the client, eliminating the need for manual state transfer.

4. **Streaming SSR**: Critical content can be sent immediately while loading slower data incrementally, providing a better user experience.

5. **Built-in Caching**: TanStack Router provides built-in SWR (stale-while-revalidate) caching for route loaders, making data fetching more efficient.

6. **Better Error Handling**: Clear error messages are shown to users when data is missing or invalid, improving the user experience.

## Testing Plan

1. Navigate to the learning map and select a subject
2. Click on a module node to navigate to the chat screen
3. Verify that the correct subject and module information is displayed
4. Verify that the lesson content is generated based on the selected module
5. Test the refresh functionality to ensure it works correctly
6. Test with different subjects and modules to ensure consistency
7. Test error scenarios:
   - Try accessing a non-existent subject ID
   - Try accessing a non-existent module ID
   - Test with a module that has missing data fields

## Error Handling Strategy

Instead of falling back to default parameters, we now show appropriate error pages:

1. **Missing Subject or Module**: If the subject or module cannot be found, show an error page with a clear message and a link to return to the learning map.

2. **Missing Required Data**: If a module is found but is missing required data fields, show an error explaining what's missing.

3. **API Errors**: If there's an error during the lesson streaming process, show an error message with an option to refresh.
