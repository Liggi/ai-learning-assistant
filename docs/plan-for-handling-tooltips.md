# Plan for Implementing Tooltips for Bolded Concepts in Lessons

## Current State

- The `ChatLayout` component uses the `useStreamingLesson` hook to stream lesson content
- The `useStreamingLesson` hook currently provides `{ content, isLoading, error, refreshLesson, isStreamingComplete }`
- The `MarkdownDisplay` component renders markdown content with a `StrongText` component for bolded text
- The `StrongText` component in `MarkdownDisplay` now accepts tooltips and tooltipsReady props
- We have existing tooltip generation functionality in `features/generators/tooltips.ts`
- We have a utility function `extractBoldedSegments` that extracts bolded text from markdown
- The `useTooltipGeneration` hook has been implemented to generate tooltips after streaming is complete
- Framer Motion is installed in the project and available for animations

## Implementation Goals

1. ✅ Enhance the `useStreamingLesson` hook to track when streaming is complete
2. ✅ Create a separate hook for tooltip generation that runs after lesson content is complete
3. ✅ Extract bolded concepts from the completed lesson
4. ✅ Generate tooltips for these concepts using the existing tooltip generator
5. ✅ Apply tooltips to the bolded concepts in the lesson
6. ✅ Add animations for the appearance of tooltips with Framer Motion

## Technical Implementation

### 1. ✅ Modify the Streaming Lesson Hook

The `useStreamingLesson` hook has been updated to explicitly track when streaming is complete with the `isStreamingComplete` state.

### 2. ✅ Create a Clean Hook for Tooltip Generation

The `useTooltipGeneration` hook has been created to handle tooltip generation that depends on the explicit streaming completion state.

### 3. ✅ Update the MarkdownDisplay Component with Framer Motion

The `MarkdownDisplay` component has been updated to:

- Accept tooltips and tooltipsReady as props
- Pass these props to the StrongText component
- Use Framer Motion for animations on bolded text with tooltips

### 4. ✅ Update the ChatLayout Component to Coordinate Both Hooks

The `ChatLayout` component has been updated to:

- Use both hooks and coordinate between them
- Pass the necessary props to the MarkdownDisplay component
- Show a loading indicator when tooltips are being generated
- Handle refreshing by coordinating both hooks

## Followup Tasks

1. **Improve Tooltip Generation Loading State**

   - Move the "Generating tooltips" loading state to a more subtle location
   - Consider adding it to a corner or as a small indicator in the header
   - Make it visible but not distracting

2. **Enhance Tooltip Animations**

   - The current animations are too subtle or not working as expected
   - Increase the visibility of the animations
   - Ensure the staggered appearance is more noticeable
   - Consider using more prominent animation effects

3. **Fix Staggering Effect**

   - The staggered appearance of tooltips is not working as expected
   - Ensure each tooltip appears with a distinct delay
   - Consider using Framer Motion's stagger utilities instead of random delays

4. **Error Handling**

   - Add more robust error handling for tooltip generation
   - Show user-friendly error messages if tooltip generation fails

5. **Accessibility Improvements**
   - Ensure tooltips are accessible to screen readers
   - Add keyboard navigation support for tooltips
   - Consider adding ARIA attributes for better accessibility

## Implementation Steps for Followup Tasks

1. **For Tooltip Loading State:**

   - Update the ChatLayout component to move the loading indicator to a more subtle location
   - Consider adding it to the header area or as a small floating indicator

2. **For Animation Enhancements:**
   - Modify the StrongText component to use more visible animations
   - Consider using scale, opacity, or color transitions for better visibility
   - Use Framer Motion's stagger utility instead of random delays for more consistent staggering

```jsx
// Example of using Framer Motion's stagger
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};
```

3. **For Staggering Effect:**
   - Consider wrapping all StrongText components in a parent motion.div
   - Use Framer Motion's stagger utilities to create a more controlled staggering effect
   - Ensure each tooltip has a distinct and noticeable appearance animation
