import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import KnowledgeNodesStep from '@/components/knowledge-nodes-step'

const SAMPLE_KNOWLEDGE_NODES = [
  'React',
  'Advanced State Management with Redux and Context API',
  'Git',
  'Building Responsive Layouts with CSS Grid and Flexbox',
  'TypeScript',
  'Implementing Authentication and Authorization Flows',
  'API Design',
  'Performance Optimization and Web Vitals',
  'Jest',
  'Understanding the JavaScript Event Loop and Asynchronous Programming',
  'Docker',
  'Microservices Architecture and Service Communication Patterns',
  'Node.js',
  'Cross-Browser Compatibility',
  'RESTful APIs',
  'Progressive Web Apps (PWAs) and Service Workers',
]

export const Route = createFileRoute('/workshop copy/knowledge-nodes')({
  component: KnowledgeNodesRoute,
})

function KnowledgeNodesRoute() {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())

  const handleToggleNode = (id: string) => {
    const newSelected = new Set(selectedNodes)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedNodes(newSelected)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <KnowledgeNodesStep
        knowledgeNodes={SAMPLE_KNOWLEDGE_NODES}
        selectedKnowledgeNodes={selectedNodes}
        onToggleNode={handleToggleNode}
        onBack={() => console.log('Back clicked')}
        onNext={() => console.log('Next clicked')}
      />
    </div>
  )
}
