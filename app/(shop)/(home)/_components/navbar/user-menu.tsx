"use client";

import { Heart, LayoutDashboard, LogOut, Package, Settings, Sparkles, User } from "lucide-react";
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
	isLoggedIn: boolean;
	isAdmin?: boolean;
	userName?: string | null;
	userEmail?: string | null;
}

export function UserMenu({ isLoggedIn, isAdmin, userName, userEmail }: UserMenuProps) {
	const [logoutOpen, setLogoutOpen] = useState(false);

	if (!isLoggedIn) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						href={ROUTES.AUTH.SIGN_IN}
						className={cn("hidden sm:inline-flex", iconButtonClassName)}
						aria-label="Se connecter"
					>
						<User
							size={20}
							className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105"
							aria-hidden="true"
						/>
					</Link>
				</TooltipTrigger>
				<TooltipContent className="hidden lg:block">Se connecter</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger
							aria-label="Mon compte"
							className={cn("hidden sm:inline-flex", iconButtonClassName)}
						>
							<User
								size={20}
								className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105 motion-safe:group-data-[state=open]:scale-105"
								aria-hidden="true"
							/>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent className="hidden lg:block">Mon compte</TooltipContent>
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
					{isAdmin && (
						<>
							<DropdownMenuItem asChild>
								<Link href={ROUTES.ADMIN.DASHBOARD} className="cursor-pointer">
									<LayoutDashboard aria-hidden="true" />
									<span>Tableau de bord admin</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem asChild>
						<Link href={ROUTES.ACCOUNT.ORDERS} className="cursor-pointer">
							<Package aria-hidden="true" />
							<span>Mes commandes</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={ROUTES.ACCOUNT.FAVORITES} className="cursor-pointer">
							<Heart aria-hidden="true" />
							<span>Mes favoris</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={ROUTES.ACCOUNT.CUSTOMIZATIONS} className="cursor-pointer">
							<Sparkles aria-hidden="true" />
							<span>Mes personnalisations</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={ROUTES.ACCOUNT.SETTINGS} className="cursor-pointer">
							<Settings aria-hidden="true" />
							<span>Paramètres</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						preventDefault
						onSelect={() => setLogoutOpen(true)}
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
