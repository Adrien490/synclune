"use client";

import { Heart, User } from "lucide-react";
import Link from "next/link";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { QuickSearchTrigger } from "@/modules/products/components/quick-search-dialog";
import { ROUTES } from "@/shared/constants/urls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { iconButtonClassName } from "./navbar-styles";

interface NavbarIconButtonsProps {
	isLoggedIn: boolean;
}

export function NavbarIconButtons({ isLoggedIn }: NavbarIconButtonsProps) {
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
							className="transition-transform duration-300 ease-out group-hover:scale-105"
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
				<TooltipContent className="hidden lg:block">Rechercher</TooltipContent>
			</Tooltip>

			{/* Lien compte (visible sur desktop seulement) */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						href={isLoggedIn ? ROUTES.ACCOUNT.ROOT : ROUTES.AUTH.SIGN_IN}
						className={cn("hidden sm:inline-flex", iconButtonClassName)}
						aria-label={isLoggedIn ? "Mon compte" : "Se connecter"}
					>
						<User
							size={20}
							className="transition-transform duration-300 ease-out group-hover:scale-105"
							aria-hidden="true"
						/>
					</Link>
				</TooltipTrigger>
				<TooltipContent className="hidden lg:block">
					{isLoggedIn ? "Mon compte" : "Se connecter"}
				</TooltipContent>
			</Tooltip>

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
