import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonLoading } from '@/components/ui/button-loading'
import KnowledgeNodesStep from '@/components/knowledge-nodes-step'
import Loading from '@/components/ui/loading'

export const Route = createFileRoute('/workshop copy/static-flow/')({
  component: StaticFlowIndex,
})

const STATIC_KNOWLEDGE_NODES = [
  'React Components',
  'React Hooks',
  'State Management',
  'React Router',
  'Component Lifecycle',
  'Context API',
  'Performance Optimization',
  'Server Components',
  'Client Components',
  'Data Fetching',
]

function StaticFlowIndex() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [userSubject, setUserSubject] = useState('')
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set())

  const handleNextStep = async () => {
    setIsLoadingKnowledge(true)
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setStep(1.5)
    setIsLoadingKnowledge(false)
  }

  const handleSubmit = async () => {
    setIsButtonLoading(true)
    // Show button loading state first
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Then transition to full loading screen
    setIsLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Navigate to roadmap
    navigate({ to: '/static-flow/roadmap' })
  }

  const toggleKnowledgeNode = (id: string) => {
    setSelectedKnowledgeNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-background">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Loading />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              style={{ minWidth: 400, minHeight: 300 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-lg shadow-lg p-8 overflow-hidden relative"
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold mb-6 text-center">
                      What do you want to learn about?
                    </h2>
                    <Input
                      placeholder="e.g. React"
                      value={userSubject}
                      onChange={(e) => setUserSubject(e.target.value)}
                      className="mb-4"
                    />
                    {isLoadingKnowledge ? (
                      <ButtonLoading className="w-full" />
                    ) : (
                      <Button
                        className="w-full"
                        onClick={handleNextStep}
                        disabled={!userSubject.trim()}
                      >
                        Next
                      </Button>
                    )}
                  </motion.div>
                )}

                {step === 1.5 && (
                  <KnowledgeNodesStep
                    knowledgeNodes={STATIC_KNOWLEDGE_NODES}
                    selectedKnowledgeNodes={selectedKnowledgeNodes}
                    onToggleNode={toggleKnowledgeNode}
                    onBack={() => {
                      setStep(1)
                      setSelectedKnowledgeNodes(new Set())
                    }}
                    onNext={handleSubmit}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
