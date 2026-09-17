import { redirect } from "next/navigation";
import { getCurrentProfile, getIndustries, getLifecycleStages, getServiceLines } from "@/lib/data";
import { addIndustry, addServiceLine, toggleIndustry, toggleLifecycleStage, toggleServiceLine } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") redirect("/dashboard");

  const [industries, serviceLines, stages] = await Promise.all([
    getIndustries(true),
    getServiceLines(true),
    getLifecycleStages(true),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-text-dim">
        Industries, service lines, and lifecycle stages used across every campaign and prospect. New options are
        usable everywhere immediately — no code change needed.
      </p>

      <div className="space-y-6">
        <div className="card">
          <h2 className="mb-3 text-base font-bold">Industries</h2>
          <ul className="mb-3 divide-y divide-border">
            {industries.map((i) => {
              const toggle = async () => {
                "use server";
                await toggleIndustry(i.id, i.active);
              };
              return (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span className={i.active ? "" : "text-text-faint line-through"}>{i.name}</span>
                  <form action={toggle}>
                    <button type="submit" className="text-xs font-medium text-accent-dark hover:underline">
                      {i.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <form action={addIndustry} className="flex gap-2">
            <input name="name" placeholder="New industry" className="field-input" required />
            <button type="submit" className="btn">
              Add
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-bold">Service lines</h2>
          <ul className="mb-3 divide-y divide-border">
            {serviceLines.map((s) => {
              const toggle = async () => {
                "use server";
                await toggleServiceLine(s.id, s.active);
              };
              return (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className={s.active ? "" : "text-text-faint line-through"}>{s.name}</span>
                  <form action={toggle}>
                    <button type="submit" className="text-xs font-medium text-accent-dark hover:underline">
                      {s.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <form action={addServiceLine} className="flex gap-2">
            <input name="name" placeholder="New service line" className="field-input" required />
            <button type="submit" className="btn">
              Add
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-bold">Lifecycle stages</h2>
          <p className="mb-3 text-xs text-text-faint">
            Reordering and adding new stages needs a migration for now (each stage is referenced by a stable key) —
            deactivating an unused one is safe to do here directly.
          </p>
          <ul className="divide-y divide-border">
            {stages.map((s) => {
              const toggle = async () => {
                "use server";
                await toggleLifecycleStage(s.id, s.active);
              };
              return (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className={s.active ? "" : "text-text-faint line-through"}>
                    {s.sort_order} · {s.label}
                  </span>
                  <form action={toggle}>
                    <button type="submit" className="text-xs font-medium text-accent-dark hover:underline">
                      {s.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
