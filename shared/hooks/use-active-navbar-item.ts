"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Hook pour déterminer si un item de navigation est actif
 *
 * Gère plusieurs cas :
 * - Match exact de pathname
 * - Match de sous-pages (ex: /produits/bagues → /produits est actif)
 * - Match avec query params (ex: /produits?sortBy=best-selling)
 * - Pages de détail (ex: /creations/bague-or → /produits est actif)
 */
export function useActiveNavbarItem() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/**
	 * Vérifie si un item de menu est actif
	 * @param href - Le href de l'item (peut contenir des query params)
	 * @returns true si l'item est actif
	 */
	const isMenuItemActive = (href: string): boolean => {
		// Séparer le path des query params
		const [itemPath, itemQuery] = href.split("?");

		// Page d'accueil - match exact seulement
		if (itemPath === "/" && pathname === "/") {
			return true;
		}

		// Match avec query params (ex: /produits?sortBy=best-selling)
		if (itemQuery && itemPath) {
			// Vérifier que le path match
			const pathMatches = pathname === itemPath || pathname.startsWith(itemPath + "/");
			if (pathMatches) {
				// Vérifier les query params
				const itemParams = new URLSearchParams(itemQuery);
				let allParamsMatch = true;
				itemParams.forEach((value, key) => {
					if (searchParams.get(key) !== value) {
						allParamsMatch = false;
					}
				});
				if (allParamsMatch) {
					return true;
				}
			}
		}

		// Autres pages - match exact ou commence par href suivi d'un slash
		if (itemPath !== "/") {
			// Match exact
			if (pathname === itemPath) {
				return true;
			}
			// Match si pathname commence par itemPath/ (avec le slash pour éviter les faux positifs)
			if (pathname.startsWith(itemPath + "/")) {
				return true;
			}
		}

		// Cas spécial: les pages /creations/* sont liées à /produits
		if (itemPath === "/produits" && pathname.startsWith("/creations/")) {
			return true;
		}

		return false;
	};

	/**
	 * Retourne le "scope" actuel de navigation (section parente)
	 * Utile pour afficher un indicateur de contexte
	 */
	const getCurrentScope = (): { label: string; href: string } | null => {
		// Pages produits et créations
		if (pathname.startsWith("/produits") || pathname.startsWith("/creations/")) {
			return { label: "Les créations", href: "/produits" };
		}

		// Pages collections
		if (pathname.startsWith("/collections")) {
			return { label: "Les collections", href: "/collections" };
		}

		// Page personnalisation
		if (pathname === "/personnalisation") {
			return { label: "Personnalisation", href: "/personnalisation" };
		}

		// Pages espace client
		if (
			pathname.startsWith("/compte") ||
			pathname.startsWith("/commandes") ||
			pathname.startsWith("/favoris") ||
			pathname.startsWith("/adresses") ||
			pathname.startsWith("/parametres") ||
			pathname.startsWith("/mes-avis")
		) {
			return { label: "Mon compte", href: "/compte" };
		}

		// Pages panier/paiement
		if (pathname.startsWith("/panier") || pathname.startsWith("/paiement")) {
			return { label: "Panier", href: "/panier" };
		}

		return null;
	};

	return { isMenuItemActive, getCurrentScope };
}
