import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { EMAIL_CONTACT } from "@/shared/lib/email-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminMenuSheet } from "./_components/admin-menu-sheet";
import { AdminMobileHeader } from "./_components/admin-mobile-header";
import { AdminSidebar } from "./_components/admin-sidebar";
import { CommandPalette } from "./_components/command-palette";
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
	const result = await requireAdminWithUser();
	if ("error" in result) redirect("/connexion");

	const user = {
		name: result.user.name ?? result.user.email,
		email: result.user.email,
		avatar: result.user.image ?? undefined,
	};

	return (
		<SidebarProvider>
			<Suspense>
				<AdminSidebar user={user} />
			</Suspense>
			<SidebarInset>
				<DashboardHeaderWrapper />
				<AdminMobileHeader />
				<div className="space-y-6 p-6 pt-20 pb-6 md:pt-6">
					<Suspense>
						<SelectionProvider selectionKey="selected">{children}</SelectionProvider>
					</Suspense>
				</div>
			</SidebarInset>
			<CommandPalette />
			<AdminSpeedDial email={EMAIL_CONTACT} />
			<AdminMenuSheet user={user} />
		</SidebarProvider>
	);
}
