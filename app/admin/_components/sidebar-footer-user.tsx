"use client";

import { ChevronsUpDown, Keyboard, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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

import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from "./keyboard-shortcuts.constants";

interface SidebarFooterUserProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
}

function getInitials(name: string, email: string): string {
	const source = name.trim() || email;
	const [first, second] = source.split(/\s+/).filter(Boolean);
	if (first && second) {
		return (first.charAt(0) + second.charAt(0)).toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
}

export function SidebarFooterUser({ user }: SidebarFooterUserProps) {
	const { isMobile } = useSidebar();
	const { open: openShortcuts } = useDialog(KEYBOARD_SHORTCUTS_DIALOG_ID);
	const initials = getInitials(user.name, user.email);

	return (
		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<SidebarMenuButton
									size="lg"
									tooltip={user.name}
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								/>
							}
						>
							<Avatar className="size-8 shrink-0 rounded-lg">
								<AvatarImage src={user.image ?? undefined} alt="" />
								<AvatarFallback className="rounded-lg text-xs font-medium">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="text-muted-foreground truncate text-xs" title={user.email}>
									{user.email}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--anchor-width] min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							{/* L'aide raccourcis n'était atteignable que par une icône du header
							    dont seul le survol révélait la fonction, ou en connaissant `?`
							    d'avance. Une entrée nommée dans le menu la rend découvrable. */}
							<DropdownMenuItem className="cursor-pointer" onClick={() => openShortcuts()}>
								<Keyboard aria-hidden="true" />
								Raccourcis clavier
								<KbdGroup className="ml-auto">
									<Kbd>?</Kbd>
								</KbdGroup>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<LogoutAlertDialog>
								<DropdownMenuItem
									closeOnClick={false}
									variant="destructive"
									className="cursor-pointer"
								>
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
