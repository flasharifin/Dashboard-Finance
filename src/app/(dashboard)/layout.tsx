import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        {/* mobile: padding top untuk header, padding bottom untuk bottom nav */}
        <div className="px-4 py-4 pt-[calc(3.5rem+1rem)] pb-[calc(4rem+1rem)] md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
