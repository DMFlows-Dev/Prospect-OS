import { getLifecycleStages, getProspects } from "@/lib/data";
import { ProspectRail, type RailItem } from "@/components/prospect/ProspectRail";

export default async function ProspectsLayout({ children }: { children: React.ReactNode }) {
  const [prospects, stages] = await Promise.all([getProspects(), getLifecycleStages(true)]);
  const stageById = new Map(stages.map((s) => [s.id, s]));

  const items: RailItem[] = prospects.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    company: p.company,
    stage: p.lifecycle_stage_id ? (stageById.get(p.lifecycle_stage_id) ?? null) : null,
  }));

  return (
    <div className="flex h-screen">
      <ProspectRail items={items} />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
