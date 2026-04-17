import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SkipLink } from "@/shared/components/skip-link";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminMenuSheet } from "./_components/admin-menu-sheet";
import { AdminMobileBottomBar } from "./_components/admin-mobile-bottom-bar";
import { AdminMobileHeader } from "./_components/admin-mobile-header";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminSidebarSkeleton } from "./_components/admin-sidebar-skeleton";
import { CommandPalette } from "./_components/command-palette";
import { DashboardHeaderWrapper } from "./_components/dashboard-header-wrapper";
import { PullToRefresh } from "@/shared/components/pull-to-refresh";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SwipeBackProvider } from "@/shared/components/swipe-back-provider";

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
		<Suspense fallback={<AdminLayoutSkeleton />}>
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
	};

	return (
		<SidebarProvider>
			<SkipLink targetId="admin-main-content" />
			<PullToRefresh />
			<SwipeBackProvider />
			<Suspense fallback={<AdminSidebarSkeleton />}>
				<AdminSidebar user={user} />
			</Suspense>
			<SidebarInset>
				<DashboardHeaderWrapper />
				<AdminMobileHeader />
				<main
					id="admin-main-content"
					tabIndex={-1}
					className="space-y-6 p-6 pt-20 pb-[calc(var(--bottom-bar-height,56px)+1rem)] focus:outline-none md:pt-6 md:pb-6"
				>
					<Suspense fallback={<AdminContentSkeleton />}>
						<SelectionProvider selectionKey="selected">{children}</SelectionProvider>
					</Suspense>
				</main>
				<AdminMobileBottomBar />
			</SidebarInset>
			<CommandPalette />
			<AdminMenuSheet user={user} />
		</SidebarProvider>
	);
}

/** Skeleton racine affiché pendant la résolution de requireAdminWithUser */
function AdminLayoutSkeleton() {
	return (
		<SidebarProvider>
			<AdminSidebarSkeleton />
			<SidebarInset>
				<div className="hidden h-16 border-b md:block" aria-hidden="true" />
				<AdminContentSkeleton />
			</SidebarInset>
		</SidebarProvider>
	);
}

/** Skeleton générique pour le contenu admin pendant le streaming */
function AdminContentSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du contenu"
			className="space-y-6 p-6 pt-20 md:pt-6"
		>
			<Skeleton shape="text" className="h-8 w-64" />
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} shape="rounded" className="h-28 w-full" />
				))}
			</div>
			<Skeleton shape="rounded" className="h-64 w-full" />
			<span className="sr-only">Chargement du contenu</span>
		</div>
	);
}
