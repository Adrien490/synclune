"use client";

import { ROUTES } from "@/shared/constants/urls";
import { useParams } from "next/navigation";

/**
 * Lien de repli des frontières d'erreur des sous-formulaires de commande.
 *
 * Ces routes (`client`, `notes`, `suivi`, `adresse-livraison`,
 * `adresse-facturation`) n'avaient aucune `error.tsx` propre et héritaient de
 * `commandes/[id]/error.tsx` — une frontière de **liste**, qui affichait « Cette
 * commande n'a pas pu charger » et renvoyait à la liste, perdant le contexte de
 * la commande en cours d'édition.
 *
 * `useParams()` plutôt qu'un href statique : la destination utile depuis un
 * sous-formulaire est le **détail** de la commande, pas la liste. Repli sur la
 * liste si le segment dynamique est indisponible (cas où la frontière se
 * déclenche avant la résolution des params).
 */
export function useOrderFormBackHref(): string {
	const params = useParams<{ id?: string }>();
	const id = typeof params.id === "string" ? params.id : null;
	return id ? ROUTES.ADMIN.ORDER_DETAIL(id) : ROUTES.ADMIN.ORDERS;
}
