"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { Session } from "@/modules/auth/lib/auth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";

interface AccountDropdownProps {
	session: Session | null;
	isAdmin: boolean;
	className?: string;
}

/**
 * Account Dropdown - Menu utilisateur unifié
 *
 * Regroupe:
 * - Accès au compte
 * - Tableau de bord (si admin)
 * - Déconnexion
 *
 * Pattern Amazon/Shopify pour réduire les icônes navbar de 5 à 4.
 * Non connecté: lien simple vers /connexion
 */
export function AccountDropdown({ session, isAdmin, className }: AccountDropdownProps) {
	// Non connecté: lien simple vers connexion
	if (!session?.user) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						href="/connexion"
						className={className}
						aria-label="Se connecter"
					>
						<User
							size={20}
							className="transition-transform duration-300 ease-out group-hover:scale-105"
							aria-hidden="true"
						/>
					</Link>
				</TooltipTrigger>
				<TooltipContent>Se connecter</TooltipContent>
			</Tooltip>
		);
	}

	// Connecté: dropdown avec options
	return (
		<Tooltip>
			<DropdownMenu>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={cn(className, "cursor-pointer")}
							aria-label={`Menu de ${session.user.name || "mon compte"}`}
							aria-haspopup="menu"
						>
							<User
								size={20}
								className="transition-transform duration-300 ease-out group-hover:scale-105"
								aria-hidden="true"
							/>
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Mon compte</TooltipContent>
			<DropdownMenuContent align="end" sideOffset={8} className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="font-medium truncate">{session.user.name || "Mon compte"}</p>
					<p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/compte">
							<User aria-hidden="true" />
							Mon compte
						</Link>
					</DropdownMenuItem>
					{isAdmin && (
						<DropdownMenuItem asChild>
							<Link href="/admin">
								<LayoutDashboard aria-hidden="true" />
								Tableau de bord
							</Link>
						</DropdownMenuItem>
					)}
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
		</Tooltip>
	);
}
