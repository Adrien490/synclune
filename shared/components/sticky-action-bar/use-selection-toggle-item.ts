"use client";

import { CheckSquare } from "lucide-react";

import { useAdminListSelectionStore } from "@/shared/stores/use-admin-list-selection-store";

import type { StickyActionBarItem } from "./sticky-action-bar";

/**
 * Produit l'item « Sélectionner » de la `StickyActionBar` admin (mobile) à partir
 * du control publié par le `BulkSelectionProvider` de la liste actuellement montée
 * (bridge `useAdminListSelectionStore`).
 *
 * Permet de loger le déclencheur du mode sélection **à droite du champ de
 * recherche**, avec Filtrer/Trier/Ajouter, plutôt qu'en rangée pleine largeur
 * au-dessus de la liste (ancien `MobileSelectionHeader` mode OFF). Libère de la
 * hauteur d'écran pour les items.
 *
 * - Toggle : entre/sort du mode sélection (icône `active` quand le mode est ON,
 *   en miroir du header sticky « Annuler / Tout sélectionner » qui reste l'autre
 *   sortie en contexte de liste).
 * - Retourne `null` quand aucune liste n'est montée ou que la page est vide
 *   (`pageHasItems === false`) — l'item disparaît proprement de la barre.
 *
 * Spread conditionnel dans le tableau `items` de chaque `*-bottom-bar` :
 *
 * @example
 * ```tsx
 * const selectItem = useSelectionToggleItem();
 * const items: StickyActionBarItem[] = [
 *   filterItem,
 *   sortItem,
 *   ...(selectItem ? [selectItem] : []),
 * ];
 * ```
 */
export function useSelectionToggleItem(): StickyActionBarItem | null {
	const control = useAdminListSelectionStore((s) => s.control);

	if (!control || !control.pageHasItems) return null;

	const { selectionMode, enter, exit } = control;

	return {
		key: "select",
		icon: CheckSquare,
		label: "Sélectionner",
		ariaLabel: selectionMode ? "Quitter le mode sélection" : "Activer le mode sélection",
		onClick: () => (selectionMode ? exit() : enter()),
		active: selectionMode,
		announcement: selectionMode ? "Mode sélection activé" : undefined,
	};
}
