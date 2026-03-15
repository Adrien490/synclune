"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
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

const LogoutAlertDialog = dynamic(
	() =>
		import("@/modules/auth/components/logout-alert-dialog").then((mod) => mod.LogoutAlertDialog),
	{ ssr: true },
);

interface SidebarFooterUserProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

export function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
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
								<Avatar className="size-8 rounded-lg">
									{user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
									<AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
								</Avatar>
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
