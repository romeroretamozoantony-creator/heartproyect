type PublicShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function PublicShell({ children }: PublicShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
