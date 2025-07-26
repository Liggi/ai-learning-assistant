import { createAPIFileRoute } from '@tanstack/react-start/api'
import { auth } from '../../../../lib/auth'

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => {
    console.log("AUTH GET request:", request.url)
    return auth.handler(request)
  },
  POST: ({ request }) => {
    console.log("AUTH POST request:", request.url)
    return auth.handler(request)
  },
})