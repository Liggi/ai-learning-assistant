import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth-form'

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <AuthForm />
    </div>
  )
}