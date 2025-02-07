import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from '@xyflow/react'
import Node from '@/components/react-flow/node'
import Loading from '@/components/ui/loading'

import '@xyflow/react/dist/style.css'

const nodeTypes = { normalNode: Node }

function FlowWithProvider({
  nodes,
  edges,
}: {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeMouseEnter={() => {}}
      onNodeMouseLeave={() => {}}
    >
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export const Route = createFileRoute('/workshop copy/static')({
  component: StaticRoadmap,
})

function StaticRoadmap() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [roadmapData, setRoadmapData] = useState<{
    nodes: ReactFlowNode[]
    edges: ReactFlowEdge[]
  } | null>(null)

  useEffect(() => {
    setIsHydrated(true)
    fetch('/sample-roadmap.json')
      .then((res) => res.json())
      .then((data) => setRoadmapData(data))
  }, [])

  if (!isHydrated || !roadmapData) {
    return <Loading />
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-background">
      <ReactFlowProvider>
        <FlowWithProvider nodes={roadmapData.nodes} edges={roadmapData.edges} />
      </ReactFlowProvider>
    </div>
  )
}
