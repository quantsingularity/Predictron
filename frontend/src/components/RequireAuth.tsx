import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

/// Wraps /dashboard/* routes; asks /api/auth/me and redirects home if
/// unauthenticated. UX only, the backend enforces this too.
export function RequireAuth() {
  const { data: me, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <span className="font-mono text-sm text-text-muted">
          Loading session…
        </span>
      </div>
    );
  }
  if (isError || !me) return <Navigate to="/" replace />;

  return <Outlet />;
}
