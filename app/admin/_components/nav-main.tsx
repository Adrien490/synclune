import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { Badge } from "@/shared/components/ui/badge";
import { Fragment } from "react";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

/**
 * Navigation principale du dashboard admin
 * - Affiche les groupes de navigation avec icônes
 * - Affiche les badges de notification (commandes, remboursements, alertes)
 */
export async function NavMain() {
	return (
		<>
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
		</>
	);
}

/**
 * Badge de notification pour les items de navigation
 */
function NavBadge({ count }: { count: number }) {
	return (
		<Badge
			variant="secondary"
			className="ml-auto h-5 min-w-5 justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary"
		>
			{count > 99 ? "99+" : count}
		</Badge>
	);
}
