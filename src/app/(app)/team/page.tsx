import { redirect } from "next/navigation";
import { getCurrentProfile, getProfiles } from "@/lib/data";
import { addTeamMember, updateTeamMember } from "@/lib/actions/team";
import type { UserRole, UserStatus } from "@/types/database";

const ROLES: UserRole[] = ["bdr", "manager", "admin"];
const STATUSES: UserStatus[] = ["invited", "active", "disabled"];

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const profiles = await getProfiles();

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-bold">Team</h1>
      <p className="mb-6 text-sm text-text-dim">
        Add a BDR below with a temporary password — they can sign in straight away at /login with "Use a password instead". Anyone who signs in via
        magic link shows up as <b>Invited</b> until you activate them.
      </p>

      {sp.error && <div className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{sp.error}</div>}
      {sp.added && (
        <div className="mb-4 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent-dark">
          Added {sp.added}. Share the temporary password with them directly.
        </div>
      )}

      <form action={addTeamMember} className="card mb-6">
        <h2 className="mb-3 text-base font-bold">Add team member</h2>
        <div className="grid grid-cols-2 gap-3">
          <input name="name" required placeholder="Full name" className="field-input" />
          <input name="email" type="email" required placeholder="Email" className="field-input" />
          <input name="password" type="text" required minLength={8} placeholder="Temporary password (8+ characters)" className="field-input" />
          <select name="role" defaultValue="bdr" className="field-input">
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary mt-3">
          Add member
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-faint">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {profiles.map((p) => {
              const save = async (formData: FormData) => {
                "use server";
                const role = String(formData.get("role")) as UserRole;
                const status = String(formData.get("status")) as UserStatus;
                await updateTeamMember(p.id, role, status);
              };
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-text-dim">{p.email}</td>
                  <td colSpan={3} className="px-4 py-3">
                    <form action={save} className="flex items-center gap-2">
                      <select name="role" defaultValue={p.role} className="field-input py-1">
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="capitalize">
                            {r}
                          </option>
                        ))}
                      </select>
                      <select name="status" defaultValue={p.status} className="field-input py-1">
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="capitalize">
                            {s}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
