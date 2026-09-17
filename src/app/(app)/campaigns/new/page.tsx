import { getIndustries, getProfiles, getServiceLines } from "@/lib/data";
import { createCampaign } from "@/lib/actions/campaigns";
import { CampaignForm } from "@/components/CampaignForm";

export default async function NewCampaignPage() {
  const [industries, serviceLines, profiles] = await Promise.all([
    getIndustries(),
    getServiceLines(),
    getProfiles(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold">New campaign</h1>
      <div className="card">
        <CampaignForm
          industries={industries}
          serviceLines={serviceLines}
          profiles={profiles}
          action={createCampaign}
          submitLabel="Create campaign"
        />
      </div>
    </div>
  );
}
