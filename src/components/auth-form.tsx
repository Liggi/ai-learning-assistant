"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { signIn, signUp, getSession } from "../lib/auth-client"
import { useRouter } from "@tanstack/react-router"

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      let result
      if (mode === "signup") {
        result = await signUp.email({
          email,
          password,
          name,
        })
      } else {
        result = await signIn.email({
          email,
          password,
        })
      }
      
      if (result.data) {
        let attempts = 0;
        let session = null;
        while (attempts < 10 && !session) {
          await new Promise(resolve => setTimeout(resolve, 100));
          session = await getSession();
          attempts++;
        }
        
        if (session) {
          router.navigate({ to: "/" });
        } else {
          router.navigate({ to: "/loading" });
        }
      }
    } catch (error) {
      console.error("Auth error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGitHubSignIn() {
    setIsLoading(true)
    try {
      const result = await signIn.social({ 
        provider: "github",
        callbackURL: "/",
      })
      
      if (result.data) {
        let attempts = 0;
        let session = null;
        while (attempts < 10 && !session) {
          await new Promise(resolve => setTimeout(resolve, 100));
          session = await getSession();
          attempts++;
        }
        
        if (session) {
          router.navigate({ to: "/" });
        } else {
          router.navigate({ to: "/loading" });
        }
      }
    } catch (error) {
      console.error("GitHub auth error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h2>
        <p className="text-muted-foreground">
          {mode === "signin" 
            ? "Welcome back to your learning journey" 
            : "Start your personalized learning journey"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required={mode === "signup"}
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : mode === "signup" ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGitHubSignIn}
        disabled={isLoading}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        Continue with GitHub
      </Button>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </Card>
  )
}