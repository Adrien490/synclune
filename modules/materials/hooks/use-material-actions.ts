"use client";

import {
	ArrowSquareOutIcon,
	CopyIcon,
	NotePencilIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";

import type { TaxonomyDeletePayload } from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";

import { DELETE_MATERIAL_DIALOG_ID } from "../components/admin/delete-material-alert-dialog";
import { MATERIAL_DIALOG_ID } from "../components/material-form-dialog";

import { useDuplicateMaterial } from "./use-duplicate-material";
import { useToggleMaterialStatus } from "./use-toggle-material-status";

interface UseMaterialActionsParams {
	materialId: string;
	materialName: string;
	materialSlug: string;
	materialDescription: string | null;
	materialIsActive: boolean;
}

export function useMaterialActions({
	materialId,
	materialName,
	materialSlug,
	materialDescription,
	materialIsActive,
}: UseMaterialActionsParams): { sections: ActionMenuSection[] } {
	const { open: openDialog } = useDialog(MATERIAL_DIALOG_ID);
	// Typé contre le payload du dialog mutualisé : les clés historiques
	// (`materialId`/`materialName`) rendaient le champ caché vide et la
	// suppression impossible depuis l'UI — avec ce générique, la dérive ne
	// compile plus.
	const { open: openAlert } = useAlertDialog<TaxonomyDeletePayload>(DELETE_MATERIAL_DIALOG_ID);
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const { duplicate, isPending: isDuplicating } = useDuplicateMaterial({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir le matériau",
					onClick: () =>
						withViewTransition(() =>
							router.push(`/admin/catalogue/materiaux/${data.slug}/modifier`),
						),
				},
			});
		},
	});
	const { toggleStatus, isPending: isToggling } = useToggleMaterialStatus();

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
							router.push(`/admin/catalogue/materiaux/${materialSlug}/modifier`);
						} else {
							openDialog({
								material: {
									id: materialId,
									name: materialName,
									slug: materialSlug,
									description: materialDescription,
									isActive: materialIsActive,
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
					onSelect: () => duplicate(materialId),
				},
				{
					key: "variants",
					label: "Voir les variantes",
					icon: ArrowSquareOutIcon,
					href: `/admin/catalogue/inventaire?materialId=${materialId}`,
				},
				{
					key: "toggle",
					label: materialIsActive ? "Désactiver" : "Activer",
					icon: materialIsActive ? ToggleLeftIcon : ToggleRightIcon,
					disabled: isToggling,
					onSelect: () => toggleStatus(materialId, !materialIsActive),
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
					onSelect: () => openAlert({ id: materialId, displayName: materialName }),
				},
			],
		},
	];

	return { sections };
}
