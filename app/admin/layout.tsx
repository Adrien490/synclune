import { BottomNav } from "@/app/admin/_components/bottom-nav";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { SelectionProvider } from "@/shared/contexts/selection-context";
import { auth } from "@/modules/auth/lib/auth";
import { AdminSpeedDial } from "@/modules/dashboard/components/admin-speed-dial";
import { FAB_KEYS } from "@/shared/constants/fab";
import { getFabVisibility } from "@/shared/data/get-fab-visibility";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/shared/components/logo";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/shared/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip";
import { Button } from "@/shared/components/ui/button";
import { DashboardBreadcrumb } from "./_components/dashboard-breadcrumb";
import { UserDropdown } from "./_components/user-dropdown";
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
			<header
			className="relative hidden md:flex h-14 md:h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border"
			role="banner"
			aria-label="En-tête du tableau de bord"
		>
			<div className="flex items-center gap-2 px-4 flex-1 min-w-0">
				{/* Toggle sidebar avec raccourci clavier - caché sur mobile */}
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger className="-ml-1 shrink-0 hidden md:flex" />
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<span>Basculer le menu</span>
						<kbd className="ml-2 inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							<span className="text-xs">⌘</span>B
						</kbd>
					</TooltipContent>
				</Tooltip>
				<Separator
					orientation="vertical"
					className="mr-2 h-4 data-[orientation=vertical]:h-4 shrink-0 hidden md:block"
				/>
				{/* Breadcrumb dynamique - amélioré pour mobile */}
				<div className="min-w-0 flex-1">
					<DashboardBreadcrumb />
				</div>
			</div>

			<div className="flex items-center gap-2 px-4 shrink-0 justify-end">
				{/* Bouton Voir le site */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="h-9 gap-2"
							asChild
						>
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="h-4 w-4" aria-hidden="true" />
								<span className="hidden sm:inline">Voir le site</span>
								<span className="sr-only sm:hidden">Voir le site</span>
							</Link>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="sm:hidden">
						Voir le site
					</TooltipContent>
				</Tooltip>

				{/* User dropdown */}
				{user && <UserDropdown user={user} />}
			</div>
		</header>
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
