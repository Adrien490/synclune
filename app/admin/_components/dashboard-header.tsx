"use client";

import { UserDropdown } from "@/app/admin/_components/user-dropdown";
import { DashboardBreadcrumb } from "@/app/admin/_components/dashboard-breadcrumb";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
	user?: {
		name: string;
		email: string;
		avatar?: string;
	};
}

/**
 * Header du dashboard (Server Component)
 * Utilise Suspense pour le chargement streaming du changelog
 */
export function DashboardHeader({ user }: DashboardHeaderProps) {
	return (
		<header
			className="border-border relative hidden h-14 shrink-0 items-center justify-between gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:flex md:h-16"
			role="banner"
			aria-label="En-tête du tableau de bord"
		>
			<div className="flex min-w-0 flex-1 items-center gap-2 px-4">
				{/* Toggle sidebar avec raccourci clavier - caché sur mobile */}
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger className="-ml-1 hidden shrink-0 md:flex" />
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<span>Basculer le menu</span>
						<kbd className="bg-muted text-muted-foreground ml-2 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-xs font-medium">
							<span className="text-xs">⌘</span>B
						</kbd>
					</TooltipContent>
				</Tooltip>
				<Separator
					orientation="vertical"
					className="mr-2 hidden h-4 shrink-0 data-[orientation=vertical]:h-4 md:block"
				/>
				{/* Breadcrumb dynamique - amélioré pour mobile */}
				<div className="min-w-0 flex-1">
					<DashboardBreadcrumb />
				</div>
			</div>

			<div className="flex shrink-0 items-center justify-end gap-2 px-4">
				{/* Bouton Voir le site */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="outline" size="sm" className="h-11 gap-2" asChild>
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
	);
}
