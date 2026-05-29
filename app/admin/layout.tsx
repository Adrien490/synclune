import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SkipLink } from "@/shared/components/skip-link";
import { getAdminNavBadges } from "@/modules/orders/data/get-admin-nav-badges";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { ActionStatus } from "@/shared/types/server-action";
import type { Metadata } from "next";
import { forbidden, unauthorized } from "next/navigation";
import { Suspense } from "react";
import { AdminMenuSheet } from "./_components/admin-menu-sheet";
import { AdminMobileBottomBar } from "./_components/admin-mobile-bottom-bar";
import { AdminMobileHeader } from "./_components/admin-mobile-header";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminSidebarSkeleton } from "./_components/admin-sidebar-skeleton";
import { DashboardHeaderWrapper } from "./_components/dashboard-header-wrapper";
import { KeyboardShortcutsDialog } from "./_components/keyboard-shortcuts-dialog";
import { PullToRefresh } from "@/shared/components/pull-to-refresh";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SwipeBackProvider } from "@/shared/components/swipe-back-provider";
import { VisualViewportBridge } from "@/shared/components/visual-viewport-bridge";

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
	if ("error" in result) {
		if (result.error.status === ActionStatus.UNAUTHORIZED) unauthorized();
		forbidden();
	}

	const user = {
		name: result.user.name ?? result.user.email,
		email: result.user.email,
		image: result.user.image,
	};

	// Compteurs de files actionnables (commandes à préparer, remboursements en
	// attente) — pastilles de navigation mobile. Cache partagé tagué ADMIN_BADGES,
	// déjà invalidé par les mutations orders/refunds.
	const badges = await getAdminNavBadges();

	return (
		<SidebarProvider>
			<SkipLink targetId="admin-main-content" />
			<PullToRefresh />
			<SwipeBackProvider />
			<VisualViewportBridge />
			<SentryUserBridge userId={result.user.id} role={result.user.role} />
			<Suspense fallback={<AdminSidebarSkeleton />}>
				<AdminSidebar user={user} badges={badges} />
			</Suspense>
			<SidebarInset data-admin-layout>
				<DashboardHeaderWrapper />
				<AdminMobileHeader />
				<main
					id="admin-main-content"
					tabIndex={-1}
					style={{ "--admin-main-x": "1.5rem" } as React.CSSProperties}
					className="space-y-6 px-[var(--admin-main-x)] pt-[calc(var(--admin-header-height,3.5rem)+env(safe-area-inset-top,0px)+1rem)] pb-[calc(var(--bottom-bar-height,56px)+1rem)] focus:outline-none md:pt-6 md:pb-6"
				>
					<Suspense fallback={<AdminContentSkeleton />}>{children}</Suspense>
				</main>
				<AdminMobileBottomBar badges={badges} />
			</SidebarInset>
			<AdminMenuSheet user={user} badges={badges} />
			<KeyboardShortcutsDialog />
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
			className="space-y-6 px-6 pt-[calc(var(--admin-header-height,3.5rem)+env(safe-area-inset-top,0px)+1rem)] pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:pt-6 md:pb-6"
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
