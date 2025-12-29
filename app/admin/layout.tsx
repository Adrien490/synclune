import { BottomNav } from "@/app/admin/_components/bottom-nav";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { auth } from "@/modules/auth/lib/auth";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { EMAIL_CONTACT } from "@/shared/lib/email-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/shared/components/logo";
import Link from "next/link";
import { DashboardHeader } from "./_components/dashboard-header";
import { Fragment } from "react/jsx-runtime";
import { NavMainClient } from "./_components/nav-main-client";
import { navigationData } from "./_components/navigation-config";

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
	const session = await auth.api.getSession({
		headers: await import("next/headers").then((m) => m.headers()),
	});

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
			{navigationData.navGroups.map((group, index) => {
				const groupId = `nav-group-${index}`;
				const isLastGroup = index === navigationData.navGroups.length - 1;

				return (
					<Fragment key={group.label}>
						<SidebarGroup role="group" aria-labelledby={groupId}>
							<SidebarGroupLabel
								id={groupId}
								className="text-xs font-semibold uppercase tracking-wider text-[color:var(--sidebar-muted-foreground)]"
							>
								{group.label}
							</SidebarGroupLabel>
							<SidebarMenu className="gap-1" aria-label={group.label}>
								{group.items.map((item) => {
									const Icon = item.icon;

									return (
										<SidebarMenuItem key={item.id}>
											<NavMainClient url={item.url}>
												<Icon
													className="h-5 w-5 shrink-0"
													aria-hidden="true"
												/>
												<span className="flex-1">{item.title}</span>
											</NavMainClient>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroup>
						{!isLastGroup && <SidebarSeparator className="my-2" />}
					</Fragment>
				);
			})}
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
			<AdminSpeedDial email={EMAIL_CONTACT} />
			<footer className="md:hidden" aria-label="Navigation mobile">
				<BottomNav />
			</footer>
		</SidebarProvider>
	);
}
