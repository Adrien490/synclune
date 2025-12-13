import { AppSidebar } from "@/app/admin/_components/app-sidebar";
import { BottomNav } from "@/app/admin/_components/bottom-nav";
import { DashboardHeader } from "@/app/admin/_components/dashboard-header";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { auth } from "@/modules/auth/lib/auth";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { FAB_KEYS } from "@/shared/features/fab";
import { getFabVisibility } from "@/shared/features/fab/data/get-fab-visibility";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/shared/components/logo";
import { Link } from "lucide-react";
import { NavMain } from "./_components/nav-main";

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
	const [session, isContactFabHidden] = await Promise.all([
		auth.api.getSession({
			headers: await import("next/headers").then((m) => m.headers()),
		}),
		getFabVisibility(FAB_KEYS.CONTACT_ADRIEN),
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
		<SidebarProvider>
			<Sidebar variant="floating">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/admin">
								<Logo
									size={40}
									showText
									className="gap-2"
									imageClassName="rounded-lg"
									textClassName="text-2xl"
								/>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain />
			</SidebarContent>
		</Sidebar>
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
			<AdminSpeedDial initialHidden={isContactFabHidden} />
			<BottomNav />
		</SidebarProvider>
	);
}
