"use client";

import { LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { iconButtonClassName } from "./navbar-styles";

interface UserMenuProps {
	isAdmin?: boolean;
	userName?: string | null;
	userEmail?: string | null;
}

/**
 * Menu de la navbar boutique — **réservé à l'administratrice connectée**.
 *
 * Retrait de l'espace client (2026-07-31) : il n'y a plus de compte client, donc
 * plus rien à proposer à un visiteur. Deux choses ont disparu :
 *
 * - le **lien « Se connecter »** de la branche non connectée. Envoyer un visiteur
 *   sur `/connexion` n'a plus de sens : il ne peut ni s'inscrire, ni avoir de
 *   commandes. Il consulte sa commande via le lien de suivi de son email de
 *   confirmation (`/suivi-commande`, token HMAC).
 * - les trois entrées client (**Mes commandes**, **Mes favoris**, **Paramètres**).
 *   Les favoris restent joignables par leur icône dédiée dans la navbar, qui ne
 *   dépend d'aucune session.
 *
 * Ce qui reste est ce dont l'admin a besoin depuis la vitrine : rejoindre `/admin`
 * et se déconnecter. Le composant rend donc `null` pour tout le monde d'autre —
 * y compris une session non-admin héritée, qui n'aurait aucune destination.
 */
export function UserMenu({ isAdmin, userName, userEmail }: UserMenuProps) {
	const [logoutOpen, setLogoutOpen] = useState(false);

	if (!isAdmin) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								aria-label="Menu administration"
								className={cn("hidden lg:inline-flex", iconButtonClassName)}
							/>
						}
					>
						<User
							size={20}
							// `group-data-popup-open:` et non `group-data-[state=open]:` : reliquat
							// Radix resté après la migration Base UI, qui n'expose pas `data-state`
							// sur un trigger mais un `data-popup-open` présent ou absent. La règle
							// ne se déclenchait donc plus depuis `8a5131b62`.
							className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105 motion-safe:group-data-popup-open:scale-105"
							aria-hidden="true"
						/>
					</TooltipTrigger>
					<TooltipContent>Administration</TooltipContent>
				</Tooltip>
				<DropdownMenuContent
					align="end"
					sideOffset={8}
					className="w-60 motion-safe:duration-[var(--duration-normal)]"
				>
					{(userName ?? userEmail) && (
						<>
							<DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
								{userName && (
									<span className="text-foreground line-clamp-1 text-sm font-medium">
										{userName}
									</span>
								)}
								{userEmail && (
									<span className="text-muted-foreground line-clamp-1 text-xs font-normal">
										{userEmail}
									</span>
								)}
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem
						render={
							<Link href={ROUTES.ADMIN.DASHBOARD} prefetch={null} className="cursor-pointer" />
						}
					>
						<LayoutDashboard aria-hidden="true" />
						<span>Tableau de bord admin</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						closeOnClick={false}
						onClick={() => setLogoutOpen(true)}
						className="cursor-pointer"
					>
						<LogOut aria-hidden="true" />
						<span>Se déconnecter</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<LogoutAlertDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
		</>
	);
}
