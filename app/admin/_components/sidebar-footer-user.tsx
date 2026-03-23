"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	SidebarFooter,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/shared/components/ui/sidebar";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";

interface SidebarFooterUserProps {
	user: {
		name: string;
		email: string;
	};
}

export function SidebarFooterUser({ user }: SidebarFooterUserProps) {
	const { isMobile } = useSidebar();

	return (
		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								tooltip={user.name}
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								aria-label={`Menu utilisateur de ${user.name}`}
							>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="text-muted-foreground truncate text-xs">{user.email}</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="px-2 py-1.5 text-left text-sm">
									<p className="truncate font-medium">{user.name}</p>
									<p className="text-muted-foreground truncate text-xs">{user.email}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<LogoutAlertDialog>
								<DropdownMenuItem preventDefault className="cursor-pointer">
									<LogOut aria-hidden="true" />
									Déconnexion
								</DropdownMenuItem>
							</LogoutAlertDialog>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarFooter>
	);
}
