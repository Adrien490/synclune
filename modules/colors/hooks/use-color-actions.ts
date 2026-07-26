"use client";

import { Copy, ExternalLink, SquarePen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { DELETE_COLOR_DIALOG_ID } from "../components/admin/delete-color-alert-dialog";
import { COLOR_DIALOG_ID } from "../components/color-form-dialog";

import { useDuplicateColor } from "./use-duplicate-color";

interface UseColorActionsParams {
	colorId: string;
	colorName: string;
	colorHex: string;
	colorSlug: string;
	colorDescription?: string | null;
}

export function useColorActions({
	colorId,
	colorName,
	colorHex,
	colorSlug,
	colorDescription = null,
}: UseColorActionsParams): { sections: ActionMenuSection[] } {
	const { open: openDialog } = useDialog(COLOR_DIALOG_ID);
	const { open: openAlert } = useAlertDialog(DELETE_COLOR_DIALOG_ID);
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
					onSelect: () => openAlert({ colorId, colorName }),
				},
			],
		},
	];

	return { sections };
}
