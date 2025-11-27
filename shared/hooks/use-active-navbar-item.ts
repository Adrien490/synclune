"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";

export function useActiveNavbarItem() {
	const pathname = usePathname();

	const isMenuItemActive = useCallback(
		(href: string): boolean => {
			// Page d'accueil - match exact seulement
			if (href === "/" && pathname === "/") {
				return true;
			}

			// Autres pages - match exact ou commence par href suivi d'un slash
			// Évite les faux positifs (ex: /produits-occasion ne matchera pas /produits)
			if (href !== "/") {
				// Match exact
				if (pathname === href) {
					return true;
				}
				// Match si pathname commence par href/ (avec le slash pour éviter les faux positifs)
				if (pathname.startsWith(href + "/")) {
					return true;
				}
			}

			return false;
		},
		[pathname]
	);

	return { isMenuItemActive };
}
