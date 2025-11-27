"use client";

import { LogoutButton } from "@/modules/auth/components/logout-button";
import {
	BadgeCheck,
	ChevronsUpDown,
	LogOut,
	User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/shared/components/ui/sidebar";

export function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}) {
	const { isMobile } = useSidebar();

	// Générer les initiales pour l'avatar fallback (optimisé avec useMemo)
	const initials = useMemo(
		() =>
			user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2),
		[user.name]
	);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								{user.avatar && (
									<AvatarImage src={user.avatar} alt={user.name} />
								)}
								<AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium tracking-normal">{user.name}</span>
								<span className="truncate text-xs tracking-normal">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									{user.avatar && (
										<AvatarImage src={user.avatar} alt={user.name} />
									)}
									<AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium tracking-normal">{user.name}</span>
									<span className="truncate text-xs tracking-normal">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem asChild>
								<Link href="/admin/compte">
									<BadgeCheck />
									Mon compte
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<UserIcon />
								Voir le site
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<LogoutButton className="flex items-center gap-2 w-full cursor-pointer">
								<LogOut />
								Déconnexion
							</LogoutButton>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
