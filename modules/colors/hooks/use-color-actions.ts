"use client";

import { Copy, ExternalLink, Power, PowerOff, SquarePen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";

import type { TaxonomyDeletePayload } from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";

import { DELETE_COLOR_DIALOG_ID } from "../components/admin/delete-color-alert-dialog";
import { COLOR_DIALOG_ID } from "../components/color-form-dialog";

import { useDuplicateColor } from "./use-duplicate-color";
import { useToggleColorStatus } from "./use-toggle-color-status";

interface UseColorActionsParams {
	colorId: string;
	colorName: string;
	colorHex: string;
	colorSlug: string;
	colorDescription?: string | null;
	/**
	 * Pilote l'item Activer/Désactiver. Optionnel : `undefined` masque l'item, pour
	 * les surfaces qui ne connaissent pas l'état (rien ne doit deviner un booléen).
	 */
	colorIsActive?: boolean;
}

export function useColorActions({
	colorId,
	colorName,
	colorHex,
	colorSlug,
	colorDescription = null,
	colorIsActive,
}: UseColorActionsParams): { sections: ActionMenuSection[] } {
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
						withViewTransition(() =>
							router.push(`/admin/catalogue/couleurs/${data.slug}/modifier`),
						),
				},
			});
		},
	});

	const { toggleStatus, isPending: isToggling } = useToggleColorStatus();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: SquarePen,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/couleurs/${colorSlug}/modifier`);
						} else {
							openDialog({
								color: {
									id: colorId,
									name: colorName,
									hex: colorHex,
									slug: colorSlug,
									description: colorDescription,
								},
							});
						}
					},
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(colorId),
				},
				{
					key: "variants",
					label: "Voir les variantes",
					icon: ExternalLink,
					href: `/admin/catalogue/inventaire?colorId=${colorId}`,
				},
				// En mobile, la liste n'affiche l'état que sous forme de badge en lecture
				// seule : sans cet item, activer/désactiver une couleur y était
				// IMPOSSIBLE (l'interrupteur ne vit que dans le tableau desktop).
				// Parité avec `use-material-actions`.
				...(colorIsActive === undefined
					? []
					: [
							{
								key: "toggle",
								label: colorIsActive ? "Désactiver" : "Activer",
								icon: colorIsActive ? PowerOff : Power,
								disabled: isToggling,
								onSelect: () => toggleStatus(colorId, !colorIsActive),
							},
						]),
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					closesMenu: false,
					onSelect: () => openAlert({ id: colorId, displayName: colorName }),
				},
			],
		},
	];

	return { sections };
}
