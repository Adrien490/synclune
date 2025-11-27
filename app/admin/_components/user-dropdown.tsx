import { BadgeCheck, ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
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
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";

interface UserDropdownProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

export function UserDropdown({ user }: UserDropdownProps) {
	// Générer les initiales pour l'avatar fallback
	const initials = user.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-9 gap-2 data-[state=open]:bg-accent cursor-pointer transition-all duration-300 font-light"
					aria-label={`Menu utilisateur de ${user.name}`}
					aria-haspopup="menu"
				>
					<Avatar className="h-7 w-7">
						{user.avatar && <AvatarImage src={user.avatar} alt="" />}
						<AvatarFallback className="bg-primary text-primary-foreground text-xs">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span className="hidden md:inline-block text-sm font-medium" aria-hidden="true">
						{user.name}
					</span>
					<ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-56 rounded-lg"
				align="end"
				sideOffset={8}
			>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
						<Avatar className="h-8 w-8">
							{user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
							<AvatarFallback className="bg-primary text-primary-foreground">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-light tracking-normal">
								{user.name}
							</span>
							<span className="truncate text-xs tracking-normal text-muted-foreground font-light">
								{user.email}
							</span>
						</div>
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
