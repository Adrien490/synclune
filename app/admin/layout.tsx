import { BottomNav } from "@/app/admin/_components/bottom-nav";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { EMAIL_CONTACT } from "@/shared/lib/email-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminSidebar } from "./_components/admin-sidebar";
import { DashboardHeaderWrapper } from "./_components/dashboard-header-wrapper";

/**
 * Metadata pour le dashboard admin
 * Double protection anti-indexation (robots.txt + metadata)
 */
export const metadata: Metadata = {
	robots: {
		index: false,
		follow: false,
	},
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense>
			<AdminLayoutContent>{children}</AdminLayoutContent>
		</Suspense>
	);
}

async function AdminLayoutContent({ children }: { children: React.ReactNode }) {
	const admin = await requireAdmin();
	if ("error" in admin) redirect("/connexion");

	return (
		<SidebarProvider>
			<Suspense>
				<AdminSidebar />
			</Suspense>
			<SidebarInset>
				<DashboardHeaderWrapper />
				<main id="main-content" tabIndex={-1} className="space-y-6 p-6 pb-20 md:pb-6">
					<Suspense>
						<SelectionProvider selectionKey="selected">{children}</SelectionProvider>
					</Suspense>
				</main>
			</SidebarInset>
			<AdminSpeedDial email={EMAIL_CONTACT} />
			<footer className="md:hidden" aria-label="Navigation mobile">
				<Suspense>
					<BottomNav />
				</Suspense>
			</footer>
		</SidebarProvider>
	);
}
