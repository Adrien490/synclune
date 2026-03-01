"use client";

import { BadgeCheck, ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

// Lazy loading - dialog charge uniquement a l'ouverture
const LogoutAlertDialog = dynamic(
	() =>
		import("@/modules/auth/components/logout-alert-dialog").then((mod) => mod.LogoutAlertDialog),
	{ ssr: true },
);

interface UserDropdownProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

export function UserDropdown({ user }: UserDropdownProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="data-[state=open]:bg-accent h-9 cursor-pointer gap-2 font-light transition-all duration-300"
					aria-label={`Menu utilisateur de ${user.name}`}
					aria-haspopup="menu"
				>
					<span className="text-sm font-medium">{user.name}</span>
					<ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56 rounded-lg" align="end" sideOffset={8}>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="px-2 py-2 text-left text-sm">
						<p className="truncate font-light tracking-normal">{user.name}</p>
						<p className="text-muted-foreground truncate text-xs font-light tracking-normal">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/admin/compte">
							<BadgeCheck aria-hidden="true" />
							Mon compte
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<LogoutAlertDialog>
					<DropdownMenuItem preventDefault className="cursor-pointer">
						<LogOut aria-hidden="true" />
						Déconnexion
					</DropdownMenuItem>
				</LogoutAlertDialog>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
