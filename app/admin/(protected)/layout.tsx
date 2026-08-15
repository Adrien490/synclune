import { SIDEBAR_COOKIE_NAME, SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SkipLink } from "@/shared/components/skip-link";
import { cookies } from "next/headers";
import { getAdminNavBadges } from "@/modules/orders/data/get-admin-nav-badges";
import { hasValidAdminSession } from "@/modules/admin-auth/lib/admin-session";
import { ADMIN_DISPLAY_NAME } from "@/modules/admin-auth/constants/admin-auth.constants";
import type { Metadata } from "next";
import { unauthorized } from "next/navigation";
import { Suspense } from "react";
import { AdminMenuSheet } from "./_components/admin-menu-sheet";
import { AdminPageTitleProvider } from "./_components/admin-page-title-context";
import { AdminMobileBottomBar } from "./_components/admin-mobile-bottom-bar";
import { AdminMobileHeader } from "./_components/admin-mobile-header";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminSidebarSkeleton } from "./_components/admin-sidebar-skeleton";
import { DashboardHeader } from "./_components/dashboard-header";
import { KeyboardShortcutsDialog } from "./_components/keyboard-shortcuts-dialog";
import { PullToRefresh } from "@/shared/components/pull-to-refresh";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { Skeleton } from "@/shared/components/ui/skeleton";

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
	// Garde de chargement dur. Les navigations client entre pages admin sont,
	// elles, couvertes par l'`assertAdminPage()` de chaque page (un layout partagé
	// n'est pas ré-exécuté — cf. admin-page-auth-guard.regression.test.ts).
	if (!(await hasValidAdminSession())) {
		unauthorized();
	}

	// Identité statique : il n'y a plus de table User (migration lean, lot 1) —
	// une seule administratrice, connue par construction.
	const user = {
		name: ADMIN_DISPLAY_NAME,
		email: "",
		image: null,
	};

	// Compteurs de files actionnables — stub à zéro jusqu'au lot 4.
	const badges = await getAdminNavBadges();

	// État replié/déplié de la sidebar : `SidebarProvider` écrit le cookie mais ne
	// le relisait jamais, donc la préférence était perdue à chaque chargement dur.
	// Lecture serveur = pas de flash de sidebar ouverte avant réhydratation.
	const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== "false";

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<SkipLink targetId="admin-main-content" />
			<PullToRefresh />
			<SentryUserBridge userId="admin" userRole="ADMIN" />
			<Suspense fallback={<AdminSidebarSkeleton />}>
				<AdminSidebar user={user} badges={badges} />
			</Suspense>
			{/* Le provider doit englober le chrome (header mobile, fil d'Ariane) ET le
			    contenu : les pages de détail publient leur titre, le chrome le lit. */}
			<AdminPageTitleProvider>
				<SidebarInset data-admin-layout>
					<DashboardHeader />
					<AdminMobileHeader />
					<main
						id="admin-main-content"
						tabIndex={-1}
						style={{ "--admin-main-x": "1.5rem" } as React.CSSProperties}
						// PAS de `+ env(safe-area-inset-top)` ici : `body` porte déjà
						// `padding-top: env(safe-area-inset-top)` (pwa.css), donc `main` démarre
						// sous l'encoche. L'ajouter comptait le notch deux fois → ~47px de vide
						// mort sous le header sur tout iPhone à encoche.
						//
						// `max-w-[100rem]` (1600px) : sans plafond, les tables denses et les
						// grilles KPI `lg:grid-cols-4` s'étiraient sur toute la largeur en
						// 1920px+, et les notes / descriptions libres perdaient toute borne de
						// longueur de ligne. Volontairement SANS `mx-auto` — le contenu reste
						// collé à la sidebar plutôt que centré, sinon la gouttière gauche varie
						// avec la largeur de fenêtre et tout l'admin se décale sur les écrans
						// intermédiaires. Audit responsive 2026-07-26, P2.
						className="max-w-[100rem] space-y-6 px-[var(--admin-main-x)] pt-[calc(var(--admin-header-height,3.5rem)+1rem)] pb-[calc(var(--bottom-bar-height,56px)+1rem)] focus:outline-none md:pt-6 md:pb-6"
					>
						{/* `AdminStreamingSkeleton` (sans gabarit) : ce `<main>` porte déjà
						    plafond et paddings — cf. JSDoc des deux squelettes. */}
						<Suspense fallback={<AdminStreamingSkeleton />}>{children}</Suspense>
					</main>
					<AdminMobileBottomBar badges={badges} />
				</SidebarInset>
			</AdminPageTitleProvider>
			<AdminMenuSheet user={user} badges={badges} />
			<KeyboardShortcutsDialog />
		</SidebarProvider>
	);
}

/** Skeleton racine affiché pendant la résolution de la garde admin */
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

/** Corps du squelette admin — partagé par les deux enveloppes ci-dessous. */
function AdminContentSkeletonBody() {
	return (
		<>
			<Skeleton shape="text" className="h-8 w-64" />
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} shape="rounded" className="h-28 w-full" />
				))}
			</div>
			<Skeleton shape="rounded" className="h-64 w-full" />
			<span className="sr-only">Chargement du contenu</span>
		</>
	);
}

/**
 * Squelette admin **autonome** — remplace le `<main>` entier.
 *
 * Usage unique : `AdminLayoutSkeleton`, où il est enfant direct de `SidebarInset`
 * pendant la résolution de la garde admin. Comme aucun `<main>` n'est
 * monté à ce moment, il porte lui-même le gabarit, en parité stricte avec le
 * `<main>` — parité verrouillée par `admin-shell-width-parity.regression.test.ts`.
 */
function AdminContentSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du contenu"
			style={{ "--admin-main-x": "1.5rem" } as React.CSSProperties}
			className="max-w-[100rem] space-y-6 px-[var(--admin-main-x)] pt-[calc(var(--admin-header-height,3.5rem)+1rem)] pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:pt-6 md:pb-6"
		>
			<AdminContentSkeletonBody />
		</div>
	);
}

/**
 * Squelette admin **imbriqué** — rendu À L'INTÉRIEUR du `<main>`.
 *
 * ⚠️ Volontairement SANS gabarit. Le `<Suspense>` des children est à l'intérieur
 * d'un `<main>` qui applique déjà plafond et paddings : `AdminContentSkeleton` y
 * était utilisé tel quel, donc la gouttière horizontale doublait (48 px au lieu de
 * 24) et les paddings verticaux aussi pendant tout le fallback, avec retour sec au
 * rendu réel.
 *
 * Ne PAS fusionner avec `AdminContentSkeleton` : leurs contraintes de gabarit sont
 * opposées, et la parité stricte de l'autre est un invariant testé.
 */
function AdminStreamingSkeleton() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du contenu" className="space-y-6">
			<AdminContentSkeletonBody />
		</div>
	);
}
