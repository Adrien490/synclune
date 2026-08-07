"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/overlay-store-provider";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";

import { CreateProductTypeForm } from "@/modules/product-types/components/admin/create-product-type-form";
import {
	EditProductTypeForm,
	type EditableProductType,
} from "@/modules/product-types/components/admin/edit-product-type-form";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const PRODUCT_TYPE_DIALOG_ID = TAXONOMY_CONFIG["product-type"].formDialogId;

interface ProductTypeDialogData extends Record<string, unknown> {
	productType?: EditableProductType;
	onCreated?: (id: string) => void;
}

export function ProductTypeFormDialog() {
	const { isOpen, close, data } = useDialog<ProductTypeDialogData>(PRODUCT_TYPE_DIALOG_ID);
	const productType = data?.productType;
	const isUpdateMode = !!productType;

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<ResponsiveDialogContent className="max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le type de produit" : "Créer un type de produit"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les informations du type. Les changements seront appliqués à tous les produits utilisant ce type."
							: "Ajoutez un nouveau type pour catégoriser vos produits."}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{isUpdateMode ? (
					<EditProductTypeForm
						productType={productType!}
						onSuccess={close}
						redirectOnSuccess={false}
					/>
				) : (
					<CreateProductTypeForm
						onSuccess={close}
						onCreated={data?.onCreated}
						redirectOnSuccess={false}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
