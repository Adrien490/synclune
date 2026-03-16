"use client";

import { DashboardBreadcrumb } from "@/app/admin/_components/dashboard-breadcrumb";
import { Separator } from "@/shared/components/ui/separator";
import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

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
			</div>
		</header>
	);
}
