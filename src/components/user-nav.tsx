"use client";

import { signOut, useSession } from "../lib/auth-client";
import { Button } from "./ui/button";

export function UserNav() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img src={session.user.image} alt={session.user.name} className="h-6 w-6 rounded-full" />
        )}
        <span className="text-sm font-medium">{session.user.name}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign Out
      </Button>
    </div>
  );
}
