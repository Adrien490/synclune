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
import { fraunces } from "@/shared/styles/fonts";
import { ExternalLink } from "lucide-react";
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
		avatar?: string;
	};
}

export function AdminSidebar({ user }: AdminSidebarProps) {
	return (
		<Sidebar variant="floating" disableMobileSheet>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip={`${BRAND.name} - Administration`}>
							<Link href="/admin">
								<Logo size={40} rounded="lg" />
								<span
									className={`${fraunces.className} flex-1 truncate text-xl font-normal tracking-wide group-data-[collapsible=icon]:hidden`}
								>
									{BRAND.name}
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navigationData.navGroups.slice(1).map((group, index) => {
					const groupId = `nav-group-${index}`;
					const isLastGroup = index === navigationData.navGroups.length - 2;

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
									<SidebarMenu className="gap-1" aria-label={group.label}>
										{group.items.map((item) => (
											<SidebarMenuItem key={item.id}>
												<NavMainClient url={item.url} tooltip={item.title}>
													<span className="flex-1">{item.title}</span>
												</NavMainClient>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroup>
							)}
							{!isLastGroup && (
								<SidebarSeparator className="my-2 group-data-[collapsible=icon]:my-3" />
							)}
						</Fragment>
					);
				})}

				{/* View site link - pushed to bottom */}
				<SidebarGroup className="mt-auto">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Voir le site" className="h-9">
								<Link href="/" target="_blank" rel="noopener noreferrer">
									<ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
									<span className="flex-1">Voir le site</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			{user && <SidebarFooterUser user={user} />}
		</Sidebar>
	);
}
