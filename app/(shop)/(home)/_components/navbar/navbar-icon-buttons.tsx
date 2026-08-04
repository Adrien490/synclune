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
	isAdmin?: boolean;
	userName?: string | null;
	userEmail?: string | null;
}

export function NavbarIconButtons({ isAdmin, userName, userEmail }: NavbarIconButtonsProps) {
	return (
		<>
			{/* Icône favoris (visible sur mobile et desktop) */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Link
							href={ROUTES.SHOP.FAVORITES}
							className={cn("inline-flex", iconButtonClassName)}
							aria-label="Accéder à mes favoris"
						/>
					}
				>
					<Heart
						size={20}
						className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105"
						aria-hidden="true"
					/>
					<WishlistBadge />
				</TooltipTrigger>
				<TooltipContent className="hidden lg:block">Favoris</TooltipContent>
			</Tooltip>

			{/* Recherche globale (desktop) — icône compacte sous lg, barre « Rechercher ⌘K » à partir de lg */}
			<QuickSearchTrigger variant="bar" className="hidden sm:inline-flex" />

			{/* Menu administration — rend `null` hors session admin (desktop seulement) */}
			<UserMenu isAdmin={isAdmin} userName={userName} userEmail={userEmail} />

			{/* Icône panier - Ouvre le cart sheet */}
			<Tooltip>
				<TooltipTrigger
					render={<CartSheetTrigger className={cn("inline-flex", iconButtonClassName)} />}
				></TooltipTrigger>
				<TooltipContent className="hidden lg:block">Panier</TooltipContent>
			</Tooltip>
		</>
	);
}
