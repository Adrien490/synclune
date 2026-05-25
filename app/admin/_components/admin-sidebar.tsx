import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { BRAND } from "@/shared/constants/brand";
import { Logo } from "@/shared/components/logo";
import Link from "next/link";
import { Fragment } from "react/jsx-runtime";
import { CollapsibleNavGroup } from "./collapsible-nav-group";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";
import { SidebarFooterUser } from "./sidebar-footer-user";

interface AdminSidebarProps {
	user?: {
		name: string;
		email: string;
		image?: string | null;
	};
}

export function AdminSidebar({ user }: AdminSidebarProps) {
	return (
		<Sidebar variant="floating" disableMobileSheet>
			<SidebarHeader>
				<SidebarMenu
					// iOS Safari + VO drop implicit list role when list-style:none
					role="list"
				>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip={`${BRAND.name} - Administration`}>
							<Link href="/admin">
								<Logo size={40} rounded="lg" />
								<span className="font-cursive flex-1 truncate text-2xl font-normal tracking-wide group-data-[collapsible=icon]:hidden">
									{BRAND.name}
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navigationData.navGroups.map((group, index) => {
					const groupId = `nav-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
					const isLastGroup = index === navigationData.navGroups.length - 1;

					return (
						<Fragment key={group.label}>
							{group.collapsible ? (
								<CollapsibleNavGroup groupLabel={group.label} groupId={groupId} />
							) : (
								<SidebarGroup role="group" aria-labelledby={groupId}>
									<SidebarGroupLabel
										id={groupId}
										className="text-xs font-semibold tracking-wider text-[color:var(--sidebar-muted-foreground)] uppercase"
									>
										{group.label}
									</SidebarGroupLabel>
									<SidebarMenu
										className="gap-1"
										// iOS Safari + VO drop implicit list role when list-style:none
										role="list"
									>
										{group.items.map((item) => {
											const Icon = item.icon;
											return (
												<SidebarMenuItem key={item.id}>
													<NavMainClient url={item.url} tooltip={item.title}>
														<Icon className="size-5 shrink-0" aria-hidden="true" />
														<span className="flex-1">{item.title}</span>
													</NavMainClient>
												</SidebarMenuItem>
											);
										})}
									</SidebarMenu>
								</SidebarGroup>
							)}
							{!isLastGroup && (
								<SidebarSeparator className="my-2 group-data-[collapsible=icon]:my-3" />
							)}
						</Fragment>
					);
				})}
			</SidebarContent>
			{user && <SidebarFooterUser user={user} />}
		</Sidebar>
	);
}
