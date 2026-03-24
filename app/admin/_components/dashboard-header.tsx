"use client";

import { DashboardBreadcrumb } from "@/app/admin/_components/dashboard-breadcrumb";
import { Separator } from "@/shared/components/ui/separator";
import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

/**
 * Header du dashboard
 * Sidebar trigger + breadcrumb
 */
export function DashboardHeader() {
	return (
		<header
			className="border-border relative hidden h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:flex md:h-16"
			role="banner"
			aria-label="En-tête du tableau de bord"
		>
			<div className="flex min-w-0 flex-1 items-center gap-2 px-4">
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger className="-ml-1 hidden shrink-0 md:flex" />
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<span>Basculer le menu</span>
						<KbdGroup className="ml-2">
							<Kbd>⌘</Kbd>
							<Kbd>B</Kbd>
						</KbdGroup>
					</TooltipContent>
				</Tooltip>
				<Separator
					orientation="vertical"
					className="mr-2 hidden h-4 shrink-0 data-[orientation=vertical]:h-4 md:block"
				/>
				<div className="min-w-0 flex-1">
					<DashboardBreadcrumb />
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href="/"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none"
							aria-label="Voir le site (nouvel onglet)"
						>
							<ExternalLink className="size-4" aria-hidden="true" />
						</Link>
					</TooltipTrigger>
					<TooltipContent side="bottom">Voir le site</TooltipContent>
				</Tooltip>
			</div>
		</header>
	);
}
