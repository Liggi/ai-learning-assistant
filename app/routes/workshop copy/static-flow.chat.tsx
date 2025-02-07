import { useNavigate, useSearch, createFileRoute } from '@tanstack/react-router'
import ChatInterfaceStatic from '@/components/chat-interface-static'

export const Route = createFileRoute('/workshop copy/static-flow/chat')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      nodeId: String(search.nodeId || '1'),
    }
  },
  component: StaticChatRoute,
})

const STATIC_NODES = {
  '1': {
    label: 'React Fundamentals',
    description: 'Core concepts and basic building blocks of React',
  },
  '2': {
    label: 'JSX & Elements',
    description: 'Understanding JSX syntax and React elements',
  },
  '3': {
    label: 'Virtual DOM',
    description: "How React's Virtual DOM works and optimizes rendering",
  },
  '4': {
    label: 'Components & Props',
    description: 'Creating and composing React components',
  },
  '5': {
    label: 'Component Composition',
    description: 'Advanced patterns for composing components',
  },
  '6': {
    label: 'Higher-Order Components',
    description: 'Creating reusable component logic',
  },
  '7': {
    label: 'State & Lifecycle',
    description: 'Managing component state and lifecycle',
  },
  '8': {
    label: 'React Hooks',
    description: 'Using hooks for state and side effects',
  },
  '9': {
    label: 'Custom Hooks',
    description: 'Creating reusable hook logic',
  },
  '10': {
    label: 'Context API',
    description: 'Managing global state with Context',
  },
  '11': {
    label: 'State Management',
    description: 'Redux, Zustand, and other state solutions',
  },
  '12': {
    label: 'Data Fetching',
    description: 'React Query, SWR, and data management',
  },
  '13': {
    label: 'Performance',
    description: 'Optimizing React application performance',
  },
  '14': {
    label: 'Memoization',
    description: 'Using memo, useMemo, and useCallback',
  },
  '15': {
    label: 'Code Splitting',
    description: 'Lazy loading and route-based splitting',
  },
}

const NODE_SPECIFIC_CONTENT = {
  '1': {
    concepts: '1. Components\n2. Props\n3. State\n4. JSX\n5. Virtual DOM',
    example: 'function Welcome() {\n  return <h1>Hello, React!</h1>;\n}',
  },
  '2': {
    concepts:
      '1. JSX Syntax\n2. Elements\n3. Expressions\n4. Attributes\n5. Children',
    example:
      "const element = (\n  <div className='greeting'>\n    <h1>Hello, {name}!</h1>\n  </div>\n);",
  },
  '3': {
    concepts:
      '1. Virtual DOM\n2. Reconciliation\n3. Diffing Algorithm\n4. Batching\n5. Fiber Architecture',
    example:
      '// React handles DOM updates automatically\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}',
  },
  '4': {
    concepts:
      '1. Function Components\n2. Class Components\n3. Props\n4. Children Props\n5. Component Composition',
    example:
      "function Button({ onClick, children }) {\n  return <button onClick={onClick}>{children}</button>;\n}\n\nfunction App() {\n  return <Button onClick={() => alert('Clicked!')}>Click me</Button>;\n}",
  },
  '5': {
    concepts:
      '1. Component Composition\n2. Containment\n3. Specialization\n4. Render Props\n5. Component Patterns',
    example:
      "function Dialog({ title, children }) {\n  return (\n    <div className='dialog'>\n      <h2>{title}</h2>\n      {children}\n    </div>\n  );\n}\n\nfunction WelcomeDialog() {\n  return (\n    <Dialog title='Welcome'>\n      <p>Thank you for visiting!</p>\n    </Dialog>\n  );\n}",
  },
}

function StaticChatRoute() {
  const navigate = useNavigate()
  const { nodeId } = useSearch({ from: '/static-flow/chat' })
  const node = STATIC_NODES[nodeId as keyof typeof STATIC_NODES]

  if (!node) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-lg bg-card p-8 shadow-lg">
          <h2 className="text-xl font-bold text-red-500">Error</h2>
          <p className="mt-2">No content found for node {nodeId}</p>
          <button
            onClick={() => navigate({ to: '/static-flow/roadmap' })}
            className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Back to Roadmap
          </button>
        </div>
      </div>
    )
  }

  const nodeContent =
    NODE_SPECIFIC_CONTENT[nodeId as keyof typeof NODE_SPECIFIC_CONTENT]
  const staticResponses = {
    "Let's begin our lesson.": `Welcome! I'll help you understand ${node.label}. What specific aspects would you like to learn about?`,
    'What are the key concepts?':
      nodeContent?.concepts || 'Here are the key concepts for this topic...',
    'Can you show an example?':
      nodeContent?.example || "Here's a practical example...",
  }

  return (
    <ChatInterfaceStatic
      node={node}
      onBack={() => navigate({ to: '/static-flow/roadmap' })}
      staticResponses={staticResponses}
    />
  )
}
