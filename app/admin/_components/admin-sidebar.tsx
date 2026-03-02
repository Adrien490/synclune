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
import { Logo } from "@/shared/components/logo";
import Link from "next/link";
import { Fragment } from "react/jsx-runtime";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";

export function AdminSidebar() {
	return (
		<Sidebar variant="floating">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/admin">
								<Logo size={40} showText className="gap-2" rounded="lg" />
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navigationData.navGroups.map((group, index) => {
					const groupId = `nav-group-${index}`;
					const isLastGroup = index === navigationData.navGroups.length - 1;

					return (
						<Fragment key={group.label}>
							<SidebarGroup role="group" aria-labelledby={groupId}>
								<SidebarGroupLabel
									id={groupId}
									className="text-xs font-semibold tracking-wider text-[color:var(--sidebar-muted-foreground)] uppercase"
								>
									{group.label}
								</SidebarGroupLabel>
								<SidebarMenu className="gap-1" aria-label={group.label}>
									{group.items.map((item) => {
										const Icon = item.icon;

										return (
											<SidebarMenuItem key={item.id}>
												<NavMainClient url={item.url}>
													<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
			</SidebarContent>
		</Sidebar>
	);
}
