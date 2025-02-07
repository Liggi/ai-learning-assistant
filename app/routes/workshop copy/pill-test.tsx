import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  CalibrationPill,
  type CalibrationLevel,
} from '@/components/ui/calibration-pill'
import { Button } from '@/components/ui/button'

const levels: CalibrationLevel[] = [
  'Not set',
  'Lightly Calibrated',
  'Well Calibrated',
  'Finely Calibrated',
]

export const Route = createFileRoute('/workshop copy/pill-test')({
  component: PillTestRoute,
})

function PillTestRoute() {
  const [currentLevel, setCurrentLevel] = useState<CalibrationLevel | null>(
    'Not set',
  )

  const nextLevel = () => {
    const currentIndex = levels.indexOf(currentLevel || 'Not set')
    const nextIndex = (currentIndex + 1) % levels.length
    setCurrentLevel(levels[nextIndex])
  }

  const randomLevel = () => {
    const randomIndex = Math.floor(Math.random() * levels.length)
    setCurrentLevel(levels[randomIndex])
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-8">
        <CalibrationPill level={currentLevel} />

        <div className="flex gap-4">
          <Button onClick={nextLevel}>Next Level</Button>
          <Button onClick={randomLevel} variant="secondary">
            Random Level
          </Button>
        </div>
      </div>
    </div>
  )
}
