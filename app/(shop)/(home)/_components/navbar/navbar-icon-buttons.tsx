"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { QuickSearchTrigger } from "@/modules/products/components/quick-search-dialog";
import { ROUTES } from "@/shared/constants/urls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { iconButtonClassName } from "./navbar-styles";
import { UserMenu } from "./user-menu";

interface NavbarIconButtonsProps {
	isLoggedIn: boolean;
	isAdmin?: boolean;
	userName?: string | null;
	userEmail?: string | null;
}

export function NavbarIconButtons({
	isLoggedIn,
	isAdmin,
	userName,
	userEmail,
}: NavbarIconButtonsProps) {
	return (
		<>
			{/* Icône favoris (visible sur mobile et desktop) */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						href={ROUTES.ACCOUNT.FAVORITES}
						className={cn("inline-flex", iconButtonClassName)}
						aria-label="Accéder à mes favoris"
					>
						<Heart
							size={20}
							className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105"
							aria-hidden="true"
						/>
						<WishlistBadge />
					</Link>
				</TooltipTrigger>
				<TooltipContent className="hidden lg:block">Favoris</TooltipContent>
			</Tooltip>

			{/* Recherche globale (visible sur desktop seulement) */}
			<Tooltip>
				<TooltipTrigger asChild>
					<QuickSearchTrigger className="hidden sm:inline-flex" />
				</TooltipTrigger>
				<TooltipContent className="hidden items-center gap-2 lg:inline-flex">
					<span>Rechercher</span>
					<kbd className="border-border/60 bg-muted/60 text-muted-foreground inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[0.6875rem] font-medium">
						<span aria-hidden="true">⌘</span>
						<span>K</span>
					</kbd>
				</TooltipContent>
			</Tooltip>

			{/* Menu compte (dropdown si connecté, lien sinon) — desktop seulement */}
			<UserMenu
				isLoggedIn={isLoggedIn}
				isAdmin={isAdmin}
				userName={userName}
				userEmail={userEmail}
			/>

			{/* Icône panier - Ouvre le cart sheet */}
			<Tooltip>
				<TooltipTrigger asChild>
					<CartSheetTrigger className={cn("inline-flex", iconButtonClassName)} />
				</TooltipTrigger>
				<TooltipContent className="hidden lg:block">Panier</TooltipContent>
			</Tooltip>
		</>
	);
}
