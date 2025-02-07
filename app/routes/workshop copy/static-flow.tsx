import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/workshop copy/static-flow')({
  component: StaticFlowLayout,
})

function StaticFlowLayout() {
  return <Outlet />
}
