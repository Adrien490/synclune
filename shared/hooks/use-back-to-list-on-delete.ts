"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Renvoie un callback `onSuccess` pour les dialogs de suppression partagés entre
 * une page liste admin et sa page détail. Invoqué depuis une page détail
 * (pathname enfant de `listHref`), il renvoie vers la liste — évitant que la
 * route détail ne se re-rende en 404 une fois l'enregistrement supprimé.
 * Depuis la page liste : no-op (la ligne disparaît via invalidation de cache).
 */
export function useBackToListOnDelete(listHref: string): () => void {
	const pathname = usePathname();
	const router = useRouter();

	return () => {
		if (pathname !== listHref && pathname.startsWith(`${listHref}/`)) {
			router.replace(listHref); // replace : l'URL détail morte ne reste pas dans l'historique
		}
	};
}
