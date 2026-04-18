"use client";

import { Copy, EllipsisVertical, ExternalLink, Pencil, Trash2 } from "lucide-react";

import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDuplicateProductType } from "@/modules/product-types/hooks/use-duplicate-product-type";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "./delete-product-type-alert-dialog";

interface ProductTypeRowActionsProps {
	productTypeId: string;
	isSystem?: boolean;
	label: string;
	description?: string | null;
	slug: string;
	productsCount?: number;
}

export function ProductTypeRowActions({
	productTypeId,
	isSystem = false,
	label,
	description,
	slug,
	productsCount = 0,
}: ProductTypeRowActionsProps) {
	const { open } = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_TYPE_DIALOG_ID);
	const { duplicateProductType, isPending: isDuplicating } = useDuplicateProductType();

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
					onSelect: () => open({ productType: { id: productTypeId, label, description, slug } }),
				},
				{
					key: "products",
					label: "Voir les produits",
					icon: ExternalLink,
					href: `/admin/catalogue/produits?productTypeId=${productTypeId}`,
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
					onSelect: () => deleteDialog.open({ productTypeId, label, productsCount }),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label="Actions"
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" description={label} sections={sections} />
		</ResponsiveActionMenu>
	);
}
