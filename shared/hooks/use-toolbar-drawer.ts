"use client";

import { useSheetStore } from "@/shared/providers/overlay-store-provider";
import type { SheetId } from "@/shared/types/store.types";

/**
 * Manages mutually exclusive drawer open/close state for toolbar bottom bars.
 * Only one drawer can be open at a time.
 *
 * ⚠️ L'état vit dans le `SheetStore` PARTAGÉ, pas dans un `useState` local, parce
 * que les deux moitiés de la barre d'outils sont montées dans des sous-arbres
 * DIFFÉRENTS : la barre basse rend le tiroir, mais le badge « Trié par : X »
 * (`admin-sort-badge`, `products-sort-badge`) est rendu ailleurs dans la page et
 * doit pouvoir l'ouvrir. Avec un state local, chaque appel du hook avait sa
 * propre copie — `open("sort")` depuis le badge écrivait dans un state que
 * personne ne lisait, donc taper le badge ne faisait rien.
 *
 * Le store se referme seul au changement de route
 * (`SheetAutoCloseOnNavigation`), ce qu'un state de module ne ferait pas.
 */
export function useToolbarDrawer<T extends SheetId>() {
	const openSheet = useSheetStore((state) => state.openSheet);
	const openSheetFn = useSheetStore((state) => state.open);
	const close = useSheetStore((state) => state.close);

	return {
		openDrawer: openSheet as T | null,
		open: (name: T) => openSheetFn(name),
		close,
		isOpen: (name: T) => openSheet === name,
		onOpenChange: (name: T) => (open: boolean) => (open ? openSheetFn(name) : close()),
	};
}
