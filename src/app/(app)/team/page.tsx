import { redirect } from "next/navigation";
import { getCurrentProfile, getProfiles } from "@/lib/data";
import { updateTeamMember } from "@/lib/actions/team";
import type { UserRole, UserStatus } from "@/types/database";

const ROLES: UserRole[] = ["bdr", "manager", "admin"];
const STATUSES: UserStatus[] = ["invited", "active", "disabled"];

export default async function TeamPage() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") redirect("/dashboard");

  const profiles = await getProfiles();

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-bold">Team</h1>
      <p className="mb-6 text-sm text-text-dim">
        Anyone who has signed in once via the magic link on /login shows up here as <b>Invited</b> — set their role
        and mark them Active to give them access.
      </p>

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
