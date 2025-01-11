export function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="animate-pulse space-y-4 text-center">
        <div className="h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
