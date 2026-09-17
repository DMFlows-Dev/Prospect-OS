import { notFound } from "next/navigation";
import { getCampaign, getIndustries, getProfiles, getServiceLines } from "@/lib/data";
import { updateCampaign } from "@/lib/actions/campaigns";
import { CampaignForm } from "@/components/CampaignForm";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, industries, serviceLines, profiles] = await Promise.all([
    getCampaign(id),
    getIndustries(),
    getServiceLines(),
    getProfiles(),
  ]);

  if (!campaign) notFound();

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updateCampaign(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold">{campaign.name}</h1>
      <div className="card">
        <CampaignForm
          campaign={campaign}
          industries={industries}
          serviceLines={serviceLines}
          profiles={profiles}
          action={boundUpdate}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
