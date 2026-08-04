"use client";

import { CaretRightIcon } from "@phosphor-icons/react/ssr";
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
import { isRouteActive } from "@/shared/lib/navigation";
import { usePathname } from "next/navigation";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

interface CollapsibleNavGroupProps {
	groupLabel: string;
	groupId: string;
	/** Compteurs de files actionnables (aucun item collapsible n'est badgé à ce jour). */
	badges?: AdminNavBadges;
}

export function CollapsibleNavGroup({ groupLabel, groupId, badges }: CollapsibleNavGroupProps) {
	const pathname = usePathname();
	const group = navigationData.navGroups.find((g) => g.label === groupLabel);

	if (!group) return null;

	// Ouvert par défaut si la route courante est dans le groupe, sinon replié :
	// arriver sur /admin/catalogue/produits ne doit pas laisser « Catalogue »
	// fermé, et à l'inverse un groupe hors contexte n'a pas à occuper la place.
	const hasActiveItem = group.items.some((item) => isRouteActive(pathname, item.url));

	return (
		<Collapsible defaultOpen={hasActiveItem} className="group/collapsible">
			<SidebarGroup role="group" aria-labelledby={groupId}>
				<CollapsibleTrigger
					render={
						<SidebarGroupLabel
							id={groupId}
							className="cursor-pointer text-xs font-semibold tracking-wider text-[color:var(--sidebar-muted-foreground)] uppercase hover:text-[color:var(--sidebar-foreground)]"
						/>
					}
				>
					{group.label}
					<CaretRightIcon
						className="ml-auto size-4 transition-transform group-data-open/collapsible:rotate-90"
						aria-hidden="true"
					/>
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
									<NavMainClient
										url={item.url}
										tooltip={item.title}
										badge={badges?.[item.id]}
										badgeUrl={item.badgeUrl}
									>
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
