"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

export function useSelection(selectionKey: string = "selected") {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const selectedItems = searchParams.getAll(selectionKey);
	const [optimisticSelection, setOptimisticSelection] =
		useOptimistic<string[]>(selectedItems);

	const updateUrlWithParams = (
		params: URLSearchParams,
		newSelection: string[]
	) => {
		startTransition(() => {
			setOptimisticSelection(newSelection);
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const preserveExistingParams = () => {
		const params = new URLSearchParams(searchParams);
		const existingParams = {
			page: Number(params.get("page")) || 1,
			perPage: Number(params.get("perPage")) || 10,
			search: params.get("search") || undefined,
		};

		// Préserver les filtres existants
		const filters: Record<string, string> = {};
		params.forEach((value, key) => {
			if (key.startsWith("filter_")) {
				filters[key.replace("filter_", "")] = value;
			}
		});

		return { params, existingParams, filters };
	};

	/**
	 * Met à jour la sélection d'un groupe d'éléments
	 * @param selection - Les IDs des éléments à sélectionner/désélectionner
	 * @param checked - true pour sélectionner, false pour désélectionner
	 */
	const handleSelectionChange = (selection: string[], checked: boolean) => {
		const { params } = preserveExistingParams();

		// Supprimer d'abord tous les paramètres de sélection
		params.delete(selectionKey);

		if (checked) {
			// Si on sélectionne tout, on ajoute les nouveaux éléments aux éléments déjà sélectionnés
			const newSelection = [...new Set([...optimisticSelection, ...selection])];
			newSelection.forEach((id) => params.append(selectionKey, id));
			updateUrlWithParams(params, newSelection);
		} else {
			// Si on désélectionne, on retire uniquement les éléments de la page courante
			const newSelection = optimisticSelection.filter(
				(id) => !selection.includes(id)
			);
			newSelection.forEach((id) => params.append(selectionKey, id));
			updateUrlWithParams(params, newSelection);
		}
	};

	/**
	 * Met à jour la sélection d'un élément unique
	 * @param itemId - L'ID de l'élément à sélectionner/désélectionner
	 * @param checked - true pour sélectionner, false pour désélectionner
	 */
	const handleItemSelectionChange = (itemId: string, checked: boolean) => {
		const { params } = preserveExistingParams();

		// Supprimer d'abord tous les paramètres de sélection
		params.delete(selectionKey);

		const newSelection = checked
			? [...optimisticSelection, itemId]
			: optimisticSelection.filter((id) => id !== itemId);

		newSelection.forEach((id) => params.append(selectionKey, id));
		updateUrlWithParams(params, newSelection);
	};

	/**
	 * Efface toute la sélection
	 */
	const clearAll = () => {
		const { params } = preserveExistingParams();
		params.delete(selectionKey);
		updateUrlWithParams(params, []);
	};

	/**
	 * Efface une partie de la sélection
	 * @param ids - Les IDs des éléments à désélectionner
	 */
	const clearItems = (ids: string[]) => {
		const { params } = preserveExistingParams();
		const newSelection = optimisticSelection.filter((id) => !ids.includes(id));
		params.delete(selectionKey);
		newSelection.forEach((id) => params.append(selectionKey, id));
		updateUrlWithParams(params, newSelection);
	};

	/**
	 * Retourne le nombre d'éléments sélectionnés
	 * @returns Le nombre d'éléments sélectionnés
	 */
	const getSelectedCount = () => optimisticSelection.length;

	/**
	 * Vérifie si un élément est sélectionné
	 * @param itemId - L'ID de l'élément à vérifier
	 * @returns true si l'élément est sélectionné, false sinon
	 */
	const isSelected = (itemId: string) => optimisticSelection.includes(itemId);

	/**
	 * Vérifie si tous les éléments d'une liste sont sélectionnés
	 * @param items - La liste des IDs à vérifier
	 * @returns true si tous les éléments sont sélectionnés, false sinon
	 */
	const areAllSelected = (items: string[]) =>
		items.length > 0 &&
		items.every((item) => optimisticSelection.includes(item));

	return {
		isPending,
		selectedItems: optimisticSelection,
		handleSelectionChange,
		handleItemSelectionChange,
		clearAll,
		clearItems,
		getSelectedCount,
		isSelected,
		areAllSelected,
	};
}
