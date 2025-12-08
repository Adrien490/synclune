import { AppSidebar } from "@/app/admin/_components/app-sidebar";
import { BottomNavigation } from "@/app/admin/_components/bottom-navigation";
import { DashboardHeader } from "@/app/admin/_components/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { auth } from "@/modules/auth/lib/auth";
import { ContactAdrien } from "@/modules/dashboard/components/contact-adrien";
import { getContactAdrienVisibility } from "@/modules/dashboard/data/get-contact-adrien-visibility";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session, isContactAdrienHidden] = await Promise.all([
		auth.api.getSession({
			headers: await import("next/headers").then((m) => m.headers()),
		}),
		getContactAdrienVisibility(),
	]);

	// Vérification de sécurité obligatoire
	if (!session?.user) {
		redirect("/connexion?callbackURL=/admin");
	}

	// Vérification du rôle ADMIN
	if (session.user.role !== "ADMIN") {
		redirect("/?error=access-denied");
	}

	const user = {
		name: session.user.name,
		email: session.user.email,
		avatar: session.user.image ?? undefined,
	};

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "19rem",
				} as React.CSSProperties
			}
		>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
			>
				Aller au contenu principal
			</a>
			<AppSidebar />
			<SidebarInset>
				<DashboardHeader user={user} />
				<main
					id="main-content"
					role="main"
					className="p-6 space-y-6 pb-20 md:pb-6"
				>
					<SelectionProvider selectionKey="selected">
						{children}
					</SelectionProvider>
				</main>
			</SidebarInset>
			<ContactAdrien initialHidden={isContactAdrienHidden} />
			<BottomNavigation />
		</SidebarProvider>
	);
}
