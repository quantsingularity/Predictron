import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

/// Wraps every /dashboard/* route. There's no local token to check first.
/// The session lives in an httpOnly cookie, so this always asks
/// /api/auth/me and redirects home on anything but a confirmed session.
/// This is a UX nicety only; the real enforcement for anything sensitive
/// (like the admin routes) happens server-side regardless of what this
/// component does.
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
