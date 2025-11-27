import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { Fragment } from "react";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

/**
 * Navigation principale avec icônes
 */
export function NavMain() {

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

							// Si l'item a des sous-items, afficher le parent + enfants
							if (item.items && item.items.length > 0) {
								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuSub className="ml-0 border-l-0 px-0">
											{/* Parent item */}
											<SidebarMenuSubItem>
												<NavMainClient url={item.url}>
													<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
													<span>{item.title}</span>
												</NavMainClient>
											</SidebarMenuSubItem>
											{/* Sous-items */}
											{item.items.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<NavMainClient url={subItem.url}>
														<span>{subItem.title}</span>
													</NavMainClient>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</SidebarMenuItem>
								);
							}

							// Item simple sans sous-items
							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuSub className="ml-0 border-l-0 px-0">
										<SidebarMenuSubItem>
											<NavMainClient url={item.url}>
												<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
												<span>{item.title}</span>
											</NavMainClient>
										</SidebarMenuSubItem>
									</SidebarMenuSub>
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
