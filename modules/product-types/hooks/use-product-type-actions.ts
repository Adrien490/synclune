"use client";

import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { PRODUCT_TYPE_DIALOG_ID } from "../components/product-type-form-dialog";

import { useDuplicateProductType } from "./use-duplicate-product-type";
import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "../components/admin/delete-product-type-alert-dialog";

interface UseProductTypeActionsParams {
	productTypeId: string;
	isSystem?: boolean;
	label: string;
	description?: string | null;
	slug: string;
	productsCount?: number;
}

export function useProductTypeActions({
	productTypeId,
	isSystem = false,
	label,
	description,
	slug,
	productsCount = 0,
}: UseProductTypeActionsParams): { sections: ActionMenuSection[] } {
	const { open: openFormDialog } = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_TYPE_DIALOG_ID);
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const { duplicateProductType, isPending: isDuplicating } = useDuplicateProductType({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir le type",
					onClick: () =>
						withViewTransition(() =>
							router.push(`/admin/catalogue/types-de-produits/${data.slug}/modifier`),
						),
				},
			});
		},
	});

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			label: isSystem ? "Type système protégé" : undefined,
			items: [
				{
					key: "edit",
					label: isSystem ? "Voir (lecture seule)" : "Éditer",
					icon: Pencil,
					disabled: isSystem,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/types-de-produits/${slug}/modifier`);
						} else {
							openFormDialog({
								productType: {
									id: productTypeId,
									label,
									description: description ?? null,
									slug,
								},
							});
						}
					},
				},
				{
					key: "products",
					label: "Voir les produits",
					icon: ExternalLink,
					href: `/admin/catalogue/produits?filter_typeId=${slug}`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicateProductType(productTypeId),
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
					hidden: isSystem,
					closesMenu: false,
					onSelect: () => deleteDialog.open({ productTypeId, label, productsCount }),
				},
			],
		},
	];

	return { sections };
}
