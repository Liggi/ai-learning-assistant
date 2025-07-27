import { createServerFileRoute } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: ({ request }) => {
    console.log("AUTH GET request:", request.url)
    return auth.handler(request)
  },
  POST: ({ request }) => {
    console.log("AUTH POST request:", request.url)
    return auth.handler(request)
  },
})