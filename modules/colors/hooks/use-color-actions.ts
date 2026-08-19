"use client";

import { ArrowSquareOutIcon, CopyIcon, NotePencilIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { toast } from "@/shared/utils/toast";

import type { TaxonomyDeletePayload } from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";

import { DELETE_COLOR_DIALOG_ID } from "../components/admin/delete-color-alert-dialog";
import { COLOR_DIALOG_ID } from "../components/color-form-dialog";

import { useDuplicateColor } from "./use-duplicate-color";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface UseColorActionsParams {
	colorId: string;
	colorName: string;
	colorHex: string | null;
	/**
	 * Nombre TOTAL de variantes qui portent cette couleur — actives comprises.
	 * Alimente la garde du dialog de suppression (FK ON DELETE RESTRICT) ; un
	 * compteur filtré sur `active` annoncerait « 0 » et laisserait cliquer sur
	 * un bouton condamné.
	 */
	variantsCount?: number;
}

export function useColorActions({
	colorId,
	colorName,
	colorHex,
	variantsCount = 0,
}: UseColorActionsParams): {
	sections: ActionMenuSection[];
} {
	const { open: openDialog } = useDialog(COLOR_DIALOG_ID);
	// Typé contre le payload du dialog mutualisé : les clés historiques
	// (`colorId`/`colorName`) rendaient le champ caché vide et la suppression
	// impossible depuis l'UI — avec ce générique, la dérive ne compile plus.
	const { open: openAlert } = useAlertDialog<TaxonomyDeletePayload>(DELETE_COLOR_DIALOG_ID);
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const { duplicate, isPending: isDuplicating } = useDuplicateColor({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir la couleur",
					onClick: () =>
						router.push(`/admin/catalogue/couleurs/${data.id}/modifier`, PAGE_FADE_NAVIGATION),
				},
			});
		},
	});

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: NotePencilIcon,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/couleurs/${colorId}/modifier`);
						} else {
							openDialog({
								color: {
									id: colorId,
									name: colorName,
									hex: colorHex,
								},
							});
						}
					},
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: CopyIcon,
					disabled: isDuplicating,
					onSelect: () => duplicate(colorId),
				},
				{
					key: "variants",
					label: "Voir les variantes",
					icon: ArrowSquareOutIcon,
					href: `/admin/catalogue/inventaire?colorId=${colorId}`,
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: TrashIcon,
					variant: "destructive",
					closesMenu: false,
					onSelect: () =>
						openAlert({
							id: colorId,
							displayName: colorName,
							usageCount: variantsCount,
						}),
				},
			],
		},
	];

	return { sections };
}
