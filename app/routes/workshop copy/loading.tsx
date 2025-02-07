import { createFileRoute } from '@tanstack/react-router'
import Loading from '@/components/ui/loading'

export const Route = createFileRoute('/workshop copy/loading')({
  component: LoadingTest,
})

function LoadingTest() {
  return <Loading />
}
