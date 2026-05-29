"use client";

import { ChevronRight } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import type { AdminNavBadges } from "@/modules/orders/data/get-admin-nav-badges";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

interface CollapsibleNavGroupProps {
	groupLabel: string;
	groupId: string;
	/** Compteurs de files actionnables (aucun item collapsible n'est badgé à ce jour). */
	badges?: AdminNavBadges;
}

export function CollapsibleNavGroup({ groupLabel, groupId, badges }: CollapsibleNavGroupProps) {
	const group = navigationData.navGroups.find((g) => g.label === groupLabel);

	if (!group) return null;

	return (
		<Collapsible defaultOpen className="group/collapsible">
			<SidebarGroup role="group" aria-labelledby={groupId}>
				<CollapsibleTrigger asChild>
					<SidebarGroupLabel
						id={groupId}
						className="cursor-pointer text-xs font-semibold tracking-wider text-[color:var(--sidebar-muted-foreground)] uppercase hover:text-[color:var(--sidebar-foreground)]"
					>
						{group.label}
						<ChevronRight
							className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90"
							aria-hidden="true"
						/>
					</SidebarGroupLabel>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenu
						className="gap-1"
						// iOS Safari + VO drop implicit list role when list-style:none
						role="list"
					>
						{group.items.map((item) => {
							const Icon = item.icon;
							return (
								<SidebarMenuItem key={item.id}>
									<NavMainClient url={item.url} tooltip={item.title} badge={badges?.[item.id]}>
										<Icon className="size-5 shrink-0" aria-hidden="true" />
										<span className="flex-1">{item.title}</span>
									</NavMainClient>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);
}
