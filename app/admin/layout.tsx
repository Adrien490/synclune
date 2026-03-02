import { BottomNav } from "@/app/admin/_components/bottom-nav";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { EMAIL_CONTACT } from "@/shared/lib/email-config";
import type { Metadata } from "next";
import { headers } from "next/headers";
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
		nocache: true,
	},
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	// Signal dynamic rendering - admin pages are inherently dynamic (useSearchParams in SelectionProvider)
	await headers();

	return (
		<SidebarProvider>
			<AdminSidebar />
			<SidebarInset>
				<DashboardHeaderWrapper />
				<main id="main-content" tabIndex={-1} className="space-y-6 p-6 pb-20 md:pb-6">
					<SelectionProvider selectionKey="selected">{children}</SelectionProvider>
				</main>
			</SidebarInset>
			<AdminSpeedDial email={EMAIL_CONTACT} />
			<footer className="md:hidden" aria-label="Navigation mobile">
				<BottomNav />
			</footer>
		</SidebarProvider>
	);
}
