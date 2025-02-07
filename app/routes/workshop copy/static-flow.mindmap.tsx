import { createFileRoute } from '@tanstack/react-router'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import ConversationNode from '@/components/conversation-node'

export const Route = createFileRoute('/workshop copy/static-flow/mindmap')({
  component: StaticMindmapRoute,
})

const STATIC_NODES = [
  {
    id: '1',
    type: 'conversationNode',
    position: { x: 250, y: 0 },
    data: {
      id: '1',
      text: "Welcome! Let's explore React Fundamentals. What would you like to learn about?",
      summary: 'Introducing React Fundamentals',
      isUser: false,
    },
  },
  {
    id: '2',
    type: 'conversationNode',
    position: { x: 50, y: 100 },
    data: {
      id: '2',
      text: 'How do components work?',
      summary: 'How do components work?',
      isUser: true,
    },
  },
  {
    id: '3',
    type: 'conversationNode',
    position: { x: 50, y: 200 },
    data: {
      id: '3',
      text: 'Components are the building blocks of React applications. They are reusable pieces of UI that can contain their own logic and styling.',
      summary: 'Building blocks of React',
      isUser: false,
    },
  },
  {
    id: '4',
    type: 'conversationNode',
    position: { x: 0, y: 300 },
    data: {
      id: '4',
      text: 'Can you show an example?',
      summary: 'Show component example',
      isUser: true,
    },
  },
  {
    id: '5',
    type: 'conversationNode',
    position: { x: 0, y: 400 },
    data: {
      id: '5',
      text: "Here's a simple component example:\n\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}</h1>;\n}",
      summary: 'Basic component example',
      isUser: false,
    },
  },
  {
    id: '6',
    type: 'conversationNode',
    position: { x: 250, y: 100 },
    data: {
      id: '6',
      text: "What's the Virtual DOM?",
      summary: "What's Virtual DOM?",
      isUser: true,
    },
  },
  {
    id: '7',
    type: 'conversationNode',
    position: { x: 250, y: 200 },
    data: {
      id: '7',
      text: "The Virtual DOM is React's lightweight copy of the actual DOM. It helps optimize rendering by minimizing direct DOM manipulation.",
      summary: 'Virtual DOM explained',
      isUser: false,
    },
  },
  {
    id: '8',
    type: 'conversationNode',
    position: { x: 200, y: 300 },
    data: {
      id: '8',
      text: 'Why is it more efficient?',
      summary: 'Why more efficient?',
      isUser: true,
    },
  },
  {
    id: '9',
    type: 'conversationNode',
    position: { x: 200, y: 400 },
    data: {
      id: '9',
      text: 'It batches multiple changes together and updates the real DOM only once, reducing expensive DOM operations.',
      summary: 'Batches DOM updates',
      isUser: false,
    },
  },
  {
    id: '10',
    type: 'conversationNode',
    position: { x: 450, y: 100 },
    data: {
      id: '10',
      text: 'What is JSX?',
      summary: 'What is JSX?',
      isUser: true,
    },
  },
  {
    id: '11',
    type: 'conversationNode',
    position: { x: 450, y: 200 },
    data: {
      id: '11',
      text: 'JSX is a syntax extension for JavaScript that lets you write HTML-like code in your JavaScript files.',
      summary: 'JSX syntax explained',
      isUser: false,
    },
  },
  {
    id: '12',
    type: 'conversationNode',
    position: { x: 500, y: 300 },
    data: {
      id: '12',
      text: 'How does it get converted to JavaScript?',
      summary: 'JSX to JavaScript?',
      isUser: true,
    },
  },
  {
    id: '13',
    type: 'conversationNode',
    position: { x: 500, y: 400 },
    data: {
      id: '13',
      text: 'Babel transforms JSX into regular JavaScript function calls that create React elements.',
      summary: 'Babel transforms JSX',
      isUser: false,
    },
  },
]

const STATIC_EDGES = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e1-6',
    source: '1',
    target: '6',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e6-7',
    source: '6',
    target: '7',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e7-8',
    source: '7',
    target: '8',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e8-9',
    source: '8',
    target: '9',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e1-10',
    source: '1',
    target: '10',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e10-11',
    source: '10',
    target: '11',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e11-12',
    source: '11',
    target: '12',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
  {
    id: 'e12-13',
    source: '12',
    target: '13',
    type: 'smoothstep',
    style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
    animated: true,
  },
]

const nodeTypes = {
  conversationNode: ConversationNode,
}

const defaultEdgeOptions = {
  style: { stroke: 'rgba(148, 163, 184, 0.2)', strokeWidth: 2 },
  animated: true,
}

function StaticMindmapInner() {
  return (
    <ReactFlow
      nodes={STATIC_NODES}
      edges={STATIC_EDGES}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.5}
      maxZoom={1.5}
    />
  )
}

function StaticMindmapRoute() {
  return (
    <div className="h-screen bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800" />
      <div className="relative z-10 h-full">
        <ReactFlowProvider>
          <StaticMindmapInner />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
