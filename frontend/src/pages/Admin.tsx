import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface AdminUser {
  id: string;
  address: string;
  role: string;
  createdAt: string;
}

interface AdminStake {
  id: string;
  amount: string;
  planId: string;
  status: string;
  user: { address: string };
  createdAt: string;
}

interface AdminTicket {
  id: string;
  subject: string;
  status: string;
  user: { address: string };
  createdAt: string;
}

/// Hides itself if `me.role !== 'ADMIN'`, a UI nicety only, the backend
/// enforces this on every request regardless.
export default function Admin() {
  const queryClient = useQueryClient();

  const { data: me, isLoading: meLoading } = useCurrentUser();

  const isAdmin = me?.role === "ADMIN";

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (await api.get<{ data: AdminUser[] }>("/api/admin/users")).data.data,
    enabled: isAdmin,
  });

  const { data: stakes } = useQuery({
    queryKey: ["admin-stakes"],
    queryFn: async () =>
      (await api.get<{ data: AdminStake[] }>("/api/admin/stakes")).data.data,
    enabled: isAdmin,
  });

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () =>
      (await api.get<{ data: AdminTicket[] }>("/api/admin/tickets")).data.data,
    enabled: isAdmin,
  });

  const closeTicket = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/tickets/${id}/close`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  if (meLoading) return <p className="text-text-muted">Loading…</p>;

  if (!isAdmin) {
    return (
      <div className="rounded-panel border border-border bg-panel p-6 text-sm text-text-muted">
        This area requires an admin session. Sign in with an address that has
        been granted the ADMIN role.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-2xl font-semibold">Admin</h1>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Users ({users?.length ?? 0})
        </h2>
        <div className="overflow-hidden rounded-panel border border-border">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-panel-raised text-xs uppercase tracking-widest text-text-faint">
              <tr>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">{u.address}</td>
                  <td className="px-4 py-3 text-text-muted">{u.role}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Recent stakes
        </h2>
        <div className="overflow-hidden rounded-panel border border-border">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-panel-raised text-xs uppercase tracking-widest text-text-faint">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stakes?.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">{s.user.address}</td>
                  <td className="px-4 py-3">{s.planId}</td>
                  <td className="px-4 py-3">{s.amount}</td>
                  <td className="px-4 py-3 text-text-muted">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Open tickets
        </h2>
        <div className="flex flex-col gap-2">
          {tickets?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-panel border border-border bg-panel p-4"
            >
              <div>
                <div className="text-sm">{t.subject}</div>
                <div className="font-mono text-xs text-text-muted">
                  {t.user.address}
                </div>
              </div>
              <button
                onClick={() => closeTicket.mutate(t.id)}
                className="rounded-panel border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>
          ))}
          {tickets?.length === 0 && (
            <p className="text-sm text-text-muted">No open tickets.</p>
          )}
        </div>
      </section>
    </div>
  );
}
