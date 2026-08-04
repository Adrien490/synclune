"use client";

import { HeartIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { QuickSearchTrigger } from "@/modules/products/components/quick-search-dialog";
import { ROUTES } from "@/shared/constants/urls";
import { ShortcutKbd } from "@/shared/components/ui/shortcut-kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { iconButtonClassName } from "./navbar-styles";
import { UserMenu } from "./user-menu";

interface NavbarIconButtonsProps {
	isAdmin?: boolean;
	userName?: string | null;
	userEmail?: string | null;
}

/**
 * Cluster d'actions du header — **`lg` et au-delà uniquement**.
 *
 * Sous `lg`, ces trois actions vivaient ici ET dans `ShopMobileBottomNav`, donc
 * deux fois à l'écran en même temps : le header dépensait 88 à 132px pour des
 * fonctions déjà à portée de pouce. La bottom-bar en est désormais le porteur
 * unique (Accueil · Rechercher · Favoris · Panier).
 *
 * Ce n'est pas une règle neuve, c'est l'extension d'une règle déjà écrite : le
 * déclencheur de recherche mobile avait été retiré du header en 2026-07-26 au
 * motif qu'« en garder un second en haut d'écran ferait une double affordance
 * pour la même action ». Ce raisonnement n'avait été appliqué que sous `sm` ; il
 * vaut jusqu'à `lg`, seuil auquel la bottom-bar se retire au profit de `DesktopNav`.
 *
 * ⚠️ **Prérequis :** tout layout qui rend la `Navbar` doit aussi rendre
 * `ShopMobileBottomNav` — sinon une page se retrouve sans aucune action sous `lg`.
 * C'est ce qui manquait au layout `(legal)`, corrigé en même temps.
 */
export function NavbarIconButtons({ isAdmin, userName, userEmail }: NavbarIconButtonsProps) {
	return (
		<>
			{/* Icône favoris */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Link
							href={ROUTES.SHOP.FAVORITES}
							className={cn("hidden lg:inline-flex", iconButtonClassName)}
							aria-label="Accéder à mes favoris"
						/>
					}
				>
					<HeartIcon
						size={20}
						className="ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-105"
						aria-hidden="true"
					/>
					<WishlistBadge />
				</TooltipTrigger>
				<TooltipContent>Favoris</TooltipContent>
			</Tooltip>

			{/* Recherche globale — icône compacte : la pilule « Rechercher ⌘K » de 224px
			    pesait plus lourd que les deux entrées de navigation réunies. Le raccourci
			    reste annoncé par `aria-keyshortcuts` et rappelé par l'infobulle. */}
			<Tooltip>
				<TooltipTrigger render={<QuickSearchTrigger className="hidden lg:inline-flex" />} />
				<TooltipContent>
					Rechercher <ShortcutKbd keyLabel="K" className="ml-1" />
				</TooltipContent>
			</Tooltip>

			{/* Menu administration — rend `null` hors session admin */}
			<UserMenu isAdmin={isAdmin} userName={userName} userEmail={userEmail} />

			{/* Icône panier - Ouvre le cart sheet */}
			<Tooltip>
				<TooltipTrigger
					render={<CartSheetTrigger className={cn("hidden lg:inline-flex", iconButtonClassName)} />}
				></TooltipTrigger>
				<TooltipContent>Panier</TooltipContent>
			</Tooltip>
		</>
	);
}
