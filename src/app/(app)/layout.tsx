import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.status === "invited") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="card max-w-sm text-center">
          <h1 className="text-lg font-bold">Waiting on approval</h1>
          <p className="mt-2 text-sm text-text-dim">
            Your account is signed in but hasn't been activated yet. Ask an Admin to set your role on the{" "}
            <span className="font-medium">Team</span> page.
          </p>
        </div>
      </div>
    );
  }

  if (profile.status === "disabled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="card max-w-sm text-center">
          <h1 className="text-lg font-bold">Account disabled</h1>
          <p className="mt-2 text-sm text-text-dim">Contact an Admin if you believe this is a mistake.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
