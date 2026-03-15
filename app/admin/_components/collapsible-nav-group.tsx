"use client";

import { usePathname } from "next/navigation";
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
import { isRouteActive } from "@/shared/lib/navigation";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

interface CollapsibleNavGroupProps {
	groupLabel: string;
	groupId: string;
}

export function CollapsibleNavGroup({ groupLabel, groupId }: CollapsibleNavGroupProps) {
	const pathname = usePathname();
	const group = navigationData.navGroups.find((g) => g.label === groupLabel);

	if (!group) return null;

	const hasActiveChild = group.items.some((item) => isRouteActive(pathname, item.url));

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
					<SidebarMenu className="gap-1" aria-label={group.label}>
						{group.items.map((item) => (
							<SidebarMenuItem key={item.id}>
								<NavMainClient url={item.url} tooltip={item.title}>
									<span className="flex-1">{item.title}</span>
								</NavMainClient>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);
}
