"use client";

import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getSession, signIn } from "../lib/auth-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result: unknown;
      if (mode === "signup") {
        try {
          // The Better Auth React client was hanging indefinitely on signup requests
          const response = await fetch("/api/auth/sign-up/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
              name,
            }),
          });

          if (!response.ok) {
            let errorData: unknown;
            try {
              errorData = await response.json();
            } catch (_parseError) {
              const textError = await response.text();
              throw new Error(`Signup failed with status ${response.status}: ${textError}`);
            }
            throw new Error(
              errorData.message || errorData.error || `Signup failed with status ${response.status}`
            );
          }

          const data = await response.json();
          // Structure the result to match Better Auth format
          result = { data: data };

          setSuccess("Account created successfully! Signing you in...");
        } catch (signupError) {
          setError(signupError.message || "Sign up failed");
          return;
        }
      } else {
        result = await signIn.email({
          email,
          password,
        });
      }

      if (result.data) {
        if (mode === "signup") {
          setSuccess("Account created successfully! Checking authentication...");
        }

        let attempts = 0;
        let session = null;
        while (attempts < 10 && !session) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          session = await getSession();
          attempts++;
        }

        if (session) {
          if (mode === "signup") {
            setSuccess("Welcome! Your account has been created successfully.");
            await new Promise((resolve) => setTimeout(resolve, 2500));
            setSuccess("Redirecting to your dashboard...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          // @TODO: After successful signup, redirect to dashboard shows blank screen - Claude to fix
          router.navigate({ to: "/" });
        } else {
          setError("Authentication successful but session setup failed. Please try signing in.");
        }
      } else if (result.error) {
        setError(result.error.message || "Authentication failed");
      } else {
        setError("Authentication failed - please try again");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function _handleGitHubSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL: "/",
      });

      if (result.data) {
        let attempts = 0;
        let session = null;
        while (attempts < 10 && !session) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          session = await getSession();
          attempts++;
        }

        if (session) {
          router.navigate({ to: "/" });
        } else {
          router.navigate({ to: "/loading" });
        }
      } else if (result.error) {
        setError(result.error.message || "GitHub authentication failed");
      } else {
        setError("GitHub authentication failed - please try again");
      }
    } catch (error) {
      console.error("GitHub auth error:", error);
      setError(error instanceof Error ? error.message : "GitHub authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-md p-6 space-y-4 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
      }}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-100">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h2>
        {mode === "signup" && <p className="text-slate-300">Learn what you never thought to ask</p>}
      </div>

      {error && (
        <div
          className="p-3 text-sm text-red-200 rounded-xl backdrop-blur-sm border-l-2 border-l-red-400/60"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="p-3 text-sm text-green-100 rounded-xl backdrop-blur-sm"
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-slate-300">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required={mode === "signup"}
              className="backdrop-blur-sm rounded-xl border-slate-600/50 bg-slate-800/30 text-gray-100 placeholder:text-slate-400 focus:border-green-400/50 focus:ring-green-400/30 transition-all duration-200"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-300">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="backdrop-blur-sm rounded-xl border-slate-600/50 bg-slate-800/30 text-gray-100 placeholder:text-slate-400 focus:border-green-400/50 focus:ring-green-400/30 transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-slate-300">
            Password{" "}
            {mode === "signup" && (
              <span className="text-xs text-slate-400">(minimum 8 characters)</span>
            )}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="backdrop-blur-sm rounded-xl border-slate-600/50 bg-slate-800/30 text-gray-100 placeholder:text-slate-400 focus:border-green-400/50 focus:ring-green-400/30 transition-all duration-200"
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full backdrop-blur-sm rounded-xl text-gray-100 font-medium transition-all duration-200 hover:scale-[1.02]"
            disabled={isLoading}
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            {isLoading
              ? mode === "signup"
                ? "Creating Account..."
                : "Signing In..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </Button>
        </div>
      </form>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
